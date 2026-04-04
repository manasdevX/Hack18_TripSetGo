"""
Pydantic schemas for orchestrator responses.
Covers the full 7-agent refined architecture output structure.
"""
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ── Sub-schemas ──────────────────────────────────────────────────────────────

class DestinationContext(BaseModel):
    """Output from Destination & Context Agent."""
    destination: str
    areas: List[str] = Field(default_factory=list)
    weather_summary: Optional[str] = None
    best_areas_to_stay: List[str] = Field(default_factory=list)
    travel_advisories: List[str] = Field(default_factory=list)
    local_tips: Optional[str] = None


class TransportOption(BaseModel):
    """A single transport result (flight, train, bus, etc.)."""
    mode: str = "flight"              # flight | train | bus | cab
    provider: str
    route_number: Optional[str] = None
    departure: str
    arrival: str
    duration_minutes: Optional[int] = None
    price: float
    currency: str = "INR"
    class_type: str = "economy"
    source_url: Optional[str] = None


class StayOption(BaseModel):
    """A single accommodation result."""
    name: str
    address: Optional[str] = None
    area: Optional[str] = None
    rating: Optional[float] = None
    price_per_night: float
    currency: str = "INR"
    total_price: Optional[float] = None
    amenities: List[str] = Field(default_factory=list)
    source_url: Optional[str] = None


class ItineraryDay(BaseModel):
    """Structured day block within an itinerary."""
    day: int
    date: Optional[str] = None
    title: str
    activities: List[str] = Field(default_factory=list)
    meals: Optional[str] = None
    transport_notes: Optional[str] = None


class ItineraryResult(BaseModel):
    """Full itinerary output from Itinerary Planning Agent."""
    summary: Optional[str] = None
    days: List[ItineraryDay] = Field(default_factory=list)
    markdown: Optional[str] = None        # human-friendly markdown version


class BudgetSummary(BaseModel):
    """Budget allocation & cost summary."""
    total_budget: float
    allocated_transport: float
    allocated_stay: float
    allocated_activities: float
    estimated_transport_cost: float = 0.0
    estimated_stay_cost: float = 0.0
    estimated_activity_cost: float = 0.0
    total_estimated_cost: float = 0.0
    remaining_budget: float = 0.0
    cost_per_person: float = 0.0
    within_budget: bool = True


class NavigationResult(BaseModel):
    """Initialized state returned by Navigation & Continuity Agent."""
    current_day: int = 1
    current_location: str = "start"
    remaining_plan: Optional[Dict[str, Any]] = None
    replan_available: bool = True


class AgentMetrics(BaseModel):
    """Per-agent execution trace."""
    agent: str
    status: Literal["success", "fallback", "timeout", "error", "skipped", "cache_hit"]
    latency_ms: float
    cache_hit: bool = False
    result_count: int = 0
    retry_used: bool = False


# ── Top-level response ───────────────────────────────────────────────────────

class TripPlanData(BaseModel):
    """Unified data payload — matches orchestrator spec exactly."""
    destination_context: Optional[DestinationContext] = None
    transport: List[TransportOption] = Field(default_factory=list)
    stay: List[StayOption] = Field(default_factory=list)
    itinerary: Optional[ItineraryResult] = None
    budget_summary: Optional[BudgetSummary] = None
    navigation: Optional[NavigationResult] = None


class TripPlanResponse(BaseModel):
    """Root response returned by POST /plan-trip."""
    status: Literal["success", "partial_success", "need_more_info", "error"]
    data: Optional[TripPlanData] = None

    # Diagnostics
    missing: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    question: Optional[str] = None          # set when status == need_more_info
    agent_metrics: List[AgentMetrics] = Field(default_factory=list)

    # Execution meta
    total_latency_ms: float = 0.0
    llm_calls_used: int = 0
    cache_hits: int = 0
    is_replan: bool = False
