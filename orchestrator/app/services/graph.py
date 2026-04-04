"""
TripSetGo 2.0 Orchestrator (LangGraph Version)
Implements Phase 1: Stateful Orchestration with cyclic budget renegotiation.
"""
import asyncio
import logging
from typing import Annotated, Any, Dict, List, Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.request import TripPlanRequest
from app.schemas.response import (
    AgentMetrics,
    BudgetSummary,
    DestinationContext,
    ItineraryResult,
    StayOption,
    TransportOption,
    TripPlanResponse,
    TripPlanData
)
from app.services.agent_client import agent_client
from app.services.data_processor import (
    allocate_initial_budget,
    compute_final_budget,
    rank_stay,
    rank_transport
)

logger = logging.getLogger(__name__)

# ── TripState TypedDict ──────────────────────────────────────────────────────

class TripState(TypedDict):
    """The unified state of a trip planning workflow."""
    request: TripPlanRequest
    
    # Context & Results
    context: Optional[DestinationContext]
    transport_options: Annotated[List[TransportOption], operator.add]
    stay_options: Annotated[List[StayOption], operator.add]
    itinerary: Optional[ItineraryResult]
    budget_summary: Optional[BudgetSummary]
    
    # Internal Logic
    renegotiation_prompt: Optional[str]
    retry_count: int
    agent_metrics: Annotated[List[AgentMetrics], operator.add]
    errors: Annotated[List[str], operator.add]
    
    # Final assembly
    final_response: Optional[TripPlanResponse]


# ── Graph Nodes ──────────────────────────────────────────────────────────────

async def analyze_intent(state: TripState) -> Dict[str, Any]:
    """Phase 1 Target: Validates the user's intent and ensures required fields."""
    req = state["request"]
    payload = req.model_dump(mode="json")
    
    result = await agent_client.call_agent("intent", payload)
    
    metrics = state.get("agent_metrics", [])
    metrics.append(AgentMetrics(
        agent="intent", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    
    if not result.success:
        return {"errors": state.get("errors", []) + ["Intent validation failed"]}
        
    return {"agent_metrics": metrics}


async def fetch_context(state: TripState) -> Dict[str, Any]:
    """Phase 3 Target: Fetches destination grounding data."""
    req = state["request"]
    payload = {
        "destination": req.destination, 
        "dates": f"{req.start_date} to {req.return_date}",
        "travellers": req.travellers,
        "group_type": req.group_type
    }
    
    result = await agent_client.call_agent("destination", payload)
    
    dest_ctx = None
    if result.success and result.data:
        try:
            dest_ctx = DestinationContext(**result.data)
        except Exception:
            dest_ctx = DestinationContext(destination=req.destination)
    
    metrics = state.get("agent_metrics", [])
    metrics.append(AgentMetrics(
        agent="destination", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    
    return {
        "context": dest_ctx,
        "agent_metrics": metrics
    }


async def source_transport_node(state: TripState) -> Dict[str, Any]:
    """Fetches transport options (Parallel)."""
    req = state["request"]
    bs = state.get("budget_summary") or allocate_initial_budget(req)
    
    # If we are renegotiating, we might tighten constraints
    target_budget = bs.allocated_transport
    if state.get("renegotiation_prompt"):
        target_budget *= 0.8  # Heuristic reduction for renegotiation
    
    payload = {
        "source": req.source,
        "destination": req.destination,
        "start_date": req.start_date.isoformat(),
        "return_date": req.return_date.isoformat(),
        "target_budget": target_budget,
        "travellers": req.travellers,
        "context": state.get("renegotiation_prompt")
    }
    
    result = await agent_client.call_agent("transport", payload)
    options = rank_transport(result.data or [], target_budget)
    
    metrics = state.get("agent_metrics", [])
    metrics.append(AgentMetrics(
        agent="transport", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms,
        result_count=len(options)
    ))
    
    return {
        "transport_options": options,
        "agent_metrics": metrics,
        "budget_summary": bs # Ensure initial split is captured
    }


async def source_stay_node(state: TripState) -> Dict[str, Any]:
    """Fetches stay options (Parallel)."""
    req = state["request"]
    bs = state.get("budget_summary") or allocate_initial_budget(req)
    
    target_budget = bs.allocated_stay
    if state.get("renegotiation_prompt"):
        target_budget *= 0.8
        
    payload = {
        "destination": req.destination,
        "check_in": req.start_date.isoformat(),
        "check_out": req.return_date.isoformat(),
        "target_budget": target_budget,
        "travellers": req.travellers,
        "context": state.get("renegotiation_prompt")
    }
    
    result = await agent_client.call_agent("stay", payload)
    nights = (req.return_date - req.start_date).days or 1
    options = rank_stay(result.data or [], target_budget / nights, nights)
    
    metrics = state.get("agent_metrics", [])
    metrics.append(AgentMetrics(
        agent="stay", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms,
        result_count=len(options)
    ))
    
    return {
        "stay_options": options,
        "agent_metrics": metrics,
        "budget_summary": bs
    }


async def calculate_budget(state: TripState) -> Dict[str, Any]:
    """Validates the plan against user constraints."""
    req = state["request"]
    bs = state["budget_summary"]
    
    # Finalize cost aggregation
    updated_bs = compute_final_budget(
        bs,
        state["transport_options"],
        state["stay_options"],
        itinerary_cost=2000.0, # Placeholder for activities
        travellers=req.travellers
    )
    
    # If over budget and haven't retried too much
    if not updated_bs.within_budget and state.get("retry_count", 0) < 1:
        return {
            "budget_summary": updated_bs,
            "renegotiation_prompt": f"Current cost of ₹{updated_bs.total_estimated_cost} exceeds budget of ₹{updated_bs.total_budget}. Find cheaper alternatives.",
            "retry_count": state.get("retry_count", 0) + 1
        }
    
    return {
        "budget_summary": updated_bs,
        "renegotiation_prompt": None
    }


async def generate_itinerary(state: TripState) -> Dict[str, Any]:
    """Human-readable formatting and daily route generation."""
    req = state["request"]
    
    # Phase 2 Target: In the future, optimize_daily_route will be called here
    payload = {
        "destination": req.destination,
        "num_days": (req.return_date - req.start_date).days + 1,
        "transport": state["transport_options"][0].model_dump() if state["transport_options"] else None,
        "stay": state["stay_options"][0].model_dump() if state["stay_options"] else None,
        "preferences": req.preferences
    }
    
    result = await agent_client.call_agent("itinerary", payload)
    
    metrics = state.get("agent_metrics", [])
    metrics.append(AgentMetrics(
        agent="itinerary", 
        status="success" if result.success else "error", 
        latency_ms=result.latency_ms
    ))
    
    return {
        "itinerary": ItineraryResult(**result.data) if result.success else None,
        "agent_metrics": metrics
    }


# ── Edge Routers ─────────────────────────────────────────────────────────────

def route_budget(state: TripState) -> Literal["generate_itinerary", "renegotiate_cycle"]:
    """Determines if the cycle should repeat or proceed to finalization."""
    if state.get("renegotiation_prompt") and state.get("retry_count", 0) <= 1:
        return "renegotiate_cycle"
    return "generate_itinerary"


# ── Graph Assembly ───────────────────────────────────────────────────────────

def create_trip_graph():
    """Builds the cyclic TripSetGo orchestration graph."""
    workflow = StateGraph(TripState)
    
    # Define Nodes
    workflow.add_node("analyze_intent", analyze_intent)
    workflow.add_node("fetch_context", fetch_context)
    workflow.add_node("source_transport", source_transport_node)
    workflow.add_node("source_stay", source_stay_node)
    workflow.add_node("calculate_budget", calculate_budget)
    workflow.add_node("generate_itinerary", generate_itinerary)
    
    # Define Edges
    workflow.add_edge(START, "analyze_intent")
    workflow.add_edge("analyze_intent", "fetch_context")
    workflow.add_edge("fetch_context", "source_transport")
    workflow.add_edge("fetch_context", "source_stay")
    
    # Parallel Sync
    workflow.add_edge("source_transport", "calculate_budget")
    workflow.add_edge("source_stay", "calculate_budget")
    
    # Cyclic Conditional Edge
    workflow.add_conditional_edges(
        "calculate_budget",
        route_budget,
        {
            "renegotiate_cycle": "source_transport", # Or stay, for simplicity we cycle both
            "generate_itinerary": "generate_itinerary"
        }
    )
    
    workflow.add_edge("generate_itinerary", END)
    
    return workflow.compile()

# Single instance
trip_graph = create_trip_graph()
