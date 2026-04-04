"""
Refined LangGraph Orchestrator Workflow (v2.0).

Architecture:
1. node_validate_intent      → (exit if incomplete)
2. node_resolve_context     
3. node_execute_parallel     → (Transport, Stay, Budget Optimization)
4. node_budget_adjustment    → (Loop once if over budget)
5. node_generate_itinerary   → (Structured/Detailed)
6. node_init_navigation      → (Continuity check)
7. node_build_response       → (Final result)
"""
import asyncio
import logging
import time
from typing import Annotated, Any, Optional, TypedDict, List, Dict

from langgraph.graph import END, START, StateGraph

from app.core.cache import cache_manager
from app.core.config import get_settings
from app.core.llm import LLMWrapper
from app.schemas.request import TripPlanRequest, NavigationState
from app.schemas.response import (
    TripPlanResponse,
    TripPlanData,
    DestinationContext,
    TransportOption,
    StayOption,
    ItineraryDay,
    ItineraryResult,
    BudgetSummary,
    NavigationResult,
    AgentMetrics
)
from app.services.agent_client import AgentCallResult, agent_client
from app.services.data_processor import (
    allocate_initial_budget,
    compute_final_budget,
    rank_transport,
    rank_stay,
    is_low_quality
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ── LangGraph State ──────────────────────────────────────────────────────────

class OrchestratorState(TypedDict, total=False):
    # Input & Config
    request: TripPlanRequest
    start_time: float
    llm: LLMWrapper # Used for tiny summarization calls or fallback

    # Shared results
    dest_context: Optional[DestinationContext]
    transport: List[TransportOption]
    stay: List[StayOption]
    itinerary: Optional[ItineraryResult]
    budget_summary: Optional[BudgetSummary]
    navigation: Optional[NavigationResult]

    # Agent Response Containers
    intent_data: Optional[Dict[str, Any]]
    dest_data: Optional[Dict[str, Any]]
    trans_data: Optional[Dict[str, Any]]
    stay_data: Optional[Dict[str, Any]]
    iti_data: Optional[Dict[str, Any]]
    nav_data: Optional[Dict[str, Any]]

    # Diagnostics
    agent_metrics: List[AgentMetrics]
    missing_agents: List[str]
    warnings: List[str]
    response: Optional[TripPlanResponse]
    
    # Control logic
    budget_retry_count: int
    cache_hits: int
    is_replan: bool


# ── Graph Nodes ──────────────────────────────────────────────────────────────

async def node_initialize(state: OrchestratorState) -> OrchestratorState:
    """Entry point: Setup metrics and timers."""
    state["start_time"] = time.perf_counter()
    state["agent_metrics"] = []
    state["missing_agents"] = []
    state["warnings"] = []
    state["cache_hits"] = 0
    state["llm"] = LLMWrapper()
    state["budget_retry_count"] = 0
    state["is_replan"] = state["request"].replan
    return state


async def node_validate_intent(state: OrchestratorState) -> OrchestratorState:
    """Call Intent & Input Validation Agent."""
    req = state["request"]
    payload = req.model_dump(mode="json")
    
    result = await agent_client.call_agent("intent", payload)
    state["intent_data"] = result.data or {}
    
    state["agent_metrics"].append(AgentMetrics(
        agent="intent", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    
    if not result.success:
        state["missing_agents"].append("intent")
        
    return state


async def node_resolve_context(state: OrchestratorState) -> OrchestratorState:
    """Call Destination & Context Agent."""
    req = state["request"]
    payload = {
        "destination": req.destination, 
        "dates": f"{req.start_date} to {req.return_date}",
        "travellers": req.travellers,
        "group_type": req.group_type
    }
    
    result = await agent_client.call_agent("destination", payload)
    state["dest_data"] = result.data or {}
    
    if result.success and result.data:
        try:
            state["dest_context"] = DestinationContext(**result.data)
        except Exception:
            state["dest_context"] = DestinationContext(destination=req.destination)
    
    state["agent_metrics"].append(AgentMetrics(
        agent="destination", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    return state


async def node_execute_parallel(state: OrchestratorState) -> OrchestratorState:
    """Concurrently call Transport, Stay, and Budget Optimization agents."""
    req = state["request"]
    nights = (req.return_date - req.start_date).days or 1
    
    # Initial budget (rule-based starting point)
    current_budget_sum = allocate_initial_budget(req)
    state["budget_summary"] = current_budget_sum

    dest_ctx = state.get("dest_context")
    dest_ctx_dict = dest_ctx.model_dump() if dest_ctx else {}

    # Payloads must match each agent's request schema
    transport_payload = {
        "source": req.source,
        "destination": req.destination,
        "start_date": req.start_date.isoformat(),
        "return_date": req.return_date.isoformat(),
        "budget": req.budget,
        "num_travelers": req.travellers,
        "preferences": req.preferences,
        "nights": nights,
        "destination_context": dest_ctx_dict,
        "target_budget": current_budget_sum.allocated_transport,
        "use_cache": req.use_cache,
        "use_api": req.use_api,
        "use_web_fallback": req.use_web_fallback,
    }

    stay_payload = {
        "destination": req.destination,
        "check_in": req.start_date.isoformat(),
        "check_out": req.return_date.isoformat(),
        "num_travelers": req.travellers,
        "budget": req.budget,
        "preferences": req.preferences,
        "nights": nights,
        "destination_context": dest_ctx_dict,
        "target_budget": current_budget_sum.allocated_stay,
        "use_cache": req.use_cache,
        "use_api": req.use_api,
        "use_web_fallback": req.use_web_fallback,
    }

    # ── Parallel execution loop ──────────────────────────────────────────────
    t_res, s_res = await asyncio.gather(
        agent_client.call_agent("transport", transport_payload),
        agent_client.call_agent("stay", stay_payload),
        return_exceptions=False,
    )
    state["trans_data"] = t_res.data or []
    state["stay_data"] = s_res.data or []
    
    # Rank results
    state["transport"] = rank_transport(state["trans_data"], current_budget_sum.allocated_transport)
    state["stay"] = rank_stay(state["stay_data"], current_budget_sum.allocated_stay/nights, nights)
    
    # Metrics
    for r, name in zip([t_res, s_res], ["transport", "stay"]):
        state["agent_metrics"].append(AgentMetrics(
            agent=name, 
            status="success" if r.success else "error", 
            latency_ms=r.latency_ms,
            result_count=len(r.data) if isinstance(r.data, list) else 0
        ))
        if not r.success:
            state["missing_agents"].append(name)

    return state


async def node_budget_adjustment(state: OrchestratorState) -> OrchestratorState:
    """Over-budget loop: re-call agents once with tighter constraints if needed."""
    bs = state["budget_summary"]
    if not bs:
        return state

    itinerary_cost = 2000.0  # Fixed activity/activity-adjacent cost for simplicity
    # Final logic for budget calculation
    state["budget_summary"] = compute_final_budget(
        bs,
        state["transport"],
        state["stay"],
        itinerary_cost=itinerary_cost,
    )
    
    if not state["budget_summary"].within_budget and state["budget_retry_count"] < 1:
        logger.info("[ORCH] OVER BUDGET -> Retrying with 20% reduced targets")
        state["budget_retry_count"] += 1
        
        # Adjust targets
        bs.allocated_stay *= 0.8
        bs.allocated_transport *= 0.8
        
        # Simple re-ranking first without re-calling API if we have enough options
        new_trans = rank_transport(state["trans_data"], bs.allocated_transport)
        new_stay = rank_stay(state["stay_data"], bs.allocated_stay / ((state["request"].return_date - state["request"].start_date).days or 1), (state["request"].return_date - state["request"].start_date).days or 1)
        
        if new_trans: state["transport"] = new_trans
        if new_stay: state["stay"] = new_stay
        
        state["budget_summary"] = compute_final_budget(
            bs,
            state["transport"],
            state["stay"],
            itinerary_cost=itinerary_cost,
        )

    # Optional integration with Budget Agent output (keeps orchestration "connected")
    # We only use it to update totals/within_budget; orchestration's BudgetSummary doesn't carry the full adjustments list.
    try:
        req = state["request"]
        nights = (req.return_date - req.start_date).days or 1
        if state.get("transport") and state.get("stay"):
            transport0 = state["transport"][0]
            stay0 = state["stay"][0]

            budget_payload = {
                "total_user_budget": req.budget,
                "selected_transport": {
                    "mode": transport0.mode,
                    "price": transport0.price,
                    "duration_hours": (transport0.duration_minutes / 60.0) if transport0.duration_minutes is not None else None,
                    "description": None,
                },
                "selected_stay": {
                    "name": stay0.name,
                    "price_per_night": stay0.price_per_night,
                    "total_nights": nights,
                    "category": stay0.area,
                    "location": stay0.area,
                },
                "estimated_other_costs": itinerary_cost,
                "preferences": req.preferences or "",
            }

            budget_result = await agent_client.call_agent("budget", budget_payload)
            state["agent_metrics"].append(AgentMetrics(
                agent="budget",
                status="success" if budget_result.success else "error",
                latency_ms=budget_result.latency_ms,
                result_count=0,
            ))

            if budget_result.success and isinstance(budget_result.data, dict):
                total_cost = budget_result.data.get("total_cost")
                budget_delta = budget_result.data.get("budget_delta")
                if isinstance(total_cost, (int, float)):
                    bs.total_estimated_cost = round(float(total_cost), 2)
                    if isinstance(budget_delta, (int, float)):
                        bs.remaining_budget = round(float(budget_delta), 2)
                    else:
                        bs.remaining_budget = round(bs.total_budget - float(total_cost), 2)
                    bs.within_budget = bs.remaining_budget >= 0
    except Exception:
        # Budget agent is best-effort; orchestration still returns a roadmap based on transport/stay + heuristic totals.
        pass

    return state


def _convert_itinerary_agent_response(agent_data: Dict[str, Any]) -> ItineraryResult:
    """
    Convert Itinerary Agent response to Orchestrator's ItineraryResult schema.

    Current Itinerary Agent output format:
      - days: [{ day_number, activities: [{time, task}], notes }]
      - travel_tips: str

    Current Orchestrator schema format:
      - days: [{ day, title, activities: [str], transport_notes? }]
    """
    if not agent_data:
        return ItineraryResult()

    days_data = agent_data.get("days") or []
    travel_tips = agent_data.get("travel_tips") or None

    # If it already matches the orchestrator shape, just parse it.
    if days_data and isinstance(days_data, list) and isinstance(days_data[0], dict) and "day" in days_data[0]:
        try:
            return ItineraryResult(**agent_data)
        except Exception:
            pass

    mapped_days: List[ItineraryDay] = []
    for idx, day_data in enumerate(days_data):
        if not isinstance(day_data, dict):
            continue

        day_number = day_data.get("day_number") or day_data.get("day") or (idx + 1)
        raw_activities = day_data.get("activities") or []

        activities: List[str] = []
        for a in raw_activities:
            if isinstance(a, dict):
                task = a.get("task")
                if task:
                    activities.append(str(task))
            elif isinstance(a, str):
                activities.append(a)

        title = day_data.get("title") or (activities[0] if activities else f"Day {day_number}")
        mapped_days.append(
            ItineraryDay(
                day=int(day_number),
                title=str(title),
                activities=activities,
                transport_notes=day_data.get("notes"),
            )
        )

    return ItineraryResult(
        summary=str(travel_tips) if travel_tips is not None else None,
        days=mapped_days,
        markdown=None,
    )


async def node_generate_itinerary(state: OrchestratorState) -> OrchestratorState:
    """Call Itinerary Planning Agent with full context."""
    req = state["request"]
    
    nights = (req.return_date - req.start_date).days or 1
    num_days = nights + 1

    dest_ctx = state.get("dest_context")
    if dest_ctx:
        destination_context = dest_ctx.model_dump()
        # Itinerary Agent request schema requires these as non-optional strings.
        destination_context["weather_summary"] = destination_context.get("weather_summary") or ""
        destination_context["local_tips"] = destination_context.get("local_tips") or ""
        destination_context["areas"] = destination_context.get("areas") or []
        destination_context["best_areas_to_stay"] = destination_context.get("best_areas_to_stay") or []
        destination_context["travel_advisories"] = destination_context.get("travel_advisories") or []
    else:
        # Itinerary Agent's ContextResponse requires these keys.
        destination_context = {
            "destination": req.destination,
            "areas": [req.destination],
            "weather_summary": "",
            "best_areas_to_stay": [req.destination],
            "travel_advisories": [],
            "local_tips": "",
        }

    transport0 = state["transport"][0] if state.get("transport") else None
    stay0 = state["stay"][0] if state.get("stay") else None

    # Itinerary Agent expects its own Transport/Stay schemas (subset fields).
    transport_details = {
        "mode": transport0.mode if transport0 else "flight",
        "price": float(transport0.price) if transport0 else float(state["budget_summary"].allocated_transport if state.get("budget_summary") else 0.0),
        "duration_hours": (transport0.duration_minutes / 60.0) if (transport0 and transport0.duration_minutes is not None) else None,
        "description": None,
    }
    stay_details = {
        "name": stay0.name if stay0 else "Standard Stay",
        "price_per_night": float(stay0.price_per_night) if stay0 else float((state["budget_summary"].allocated_stay / max(nights, 1)) if state.get("budget_summary") else 0.0),
        "total_nights": int(nights),
        "category": stay0.area if stay0 else None,
        "location": stay0.area if stay0 else None,
    }

    payload = {
        "destination": req.destination,
        "num_days": int(num_days),
        "transport_details": transport_details,
        "stay_details": stay_details,
        "destination_context": destination_context,
        "preferences": req.preferences or "",
    }

    result = await agent_client.call_agent("itinerary", payload)
    
    if result.success and result.data:
        try:
            state["itinerary"] = _convert_itinerary_agent_response(result.data)
        except Exception:
            state["itinerary"] = ItineraryResult(markdown=str(result.data))
    
    state["agent_metrics"].append(AgentMetrics(
        agent="itinerary", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    return state


async def node_init_navigation(state: OrchestratorState) -> OrchestratorState:
    """Call Navigation Agent to initialize state for progress tracking."""
    # Navigation agent expects a live-trip update payload, so for initial planning
    # we send a "trip started" message and a baseline current_state.
    payload = {
        "destination": state["request"].destination,
        "full_itinerary": state["itinerary"].model_dump() if state.get("itinerary") else {},
        "current_state": {
            "current_day": 1,
            "current_location": "start",
            "activities_completed": 0,
            "estimated_next_checkpoint": None,
            "delays_encountered": 0,
            "reason": None,
        },
        "user_update": f"Trip started on {state['request'].start_date}. No disruptions yet.",
    }
    
    result = await agent_client.call_agent("navigation", payload)
    
    if result.success and isinstance(result.data, dict):
        updated_state = result.data.get("updated_state") or {}
        state["navigation"] = NavigationResult(
            current_day=updated_state.get("current_day", 1),
            current_location=updated_state.get("current_location", "start"),
            remaining_plan=None,
            # Navigation agent is always available for future continuity checks.
            replan_available=True,
        )
    
    state["agent_metrics"].append(AgentMetrics(
        agent="navigation", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    return state


async def node_build_response(state: OrchestratorState) -> OrchestratorState:
    """Final assembly."""
    total_ms = (time.perf_counter() - state["start_time"]) * 1000
    
    overall_status = "success" if not state["missing_agents"] else "partial_success"
    
    response = TripPlanResponse(
        status=overall_status,
        data=TripPlanData(
            destination_context=state.get("dest_context"),
            transport=state["transport"],
            stay=state["stay"],
            itinerary=state["itinerary"],
            budget_summary=state["budget_summary"],
            navigation=state["navigation"]
        ),
        missing=state["missing_agents"],
        warnings=state["warnings"],
        agent_metrics=state["agent_metrics"],
        total_latency_ms=round(total_ms, 2),
        is_replan=state["is_replan"]
    )
    
    state["response"] = response
    return state


# ── Router Logic ─────────────────────────────────────────────────────────────

def route_after_intent(state: OrchestratorState) -> str:
    """Exit early if Intent Agent says incomplete."""
    intent = state.get("intent_data", {})
    if intent.get("status") == "incomplete":
        return "build_response"
    return "resolve_context"


# ── Graph Assembly ───────────────────────────────────────────────────────────

def build_orchestrator_graph() -> StateGraph:
    graph = StateGraph(OrchestratorState)

    graph.add_node("initialize", node_initialize)
    graph.add_node("validate_intent", node_validate_intent)
    graph.add_node("resolve_context", node_resolve_context)
    graph.add_node("execute_parallel", node_execute_parallel)
    graph.add_node("budget_adjustment", node_budget_adjustment)
    graph.add_node("generate_itinerary", node_generate_itinerary)
    graph.add_node("init_navigation", node_init_navigation)
    graph.add_node("build_response", node_build_response)

    graph.add_edge(START, "initialize")
    graph.add_edge("initialize", "validate_intent")
    
    graph.add_conditional_edges("validate_intent", route_after_intent)
    
    graph.add_edge("resolve_context", "execute_parallel")
    graph.add_edge("execute_parallel", "budget_adjustment")
    graph.add_edge("budget_adjustment", "generate_itinerary")
    graph.add_edge("generate_itinerary", "init_navigation")
    graph.add_edge("init_navigation", "build_response")
    graph.add_edge("build_response", END)

    return graph
