"""
Pure rule-based data processing for TripSetGo 2.0.
NO LLM calls here — only Python logic for ranking, filtering and budget splitting.
"""
import logging
from typing import Any, List, Optional, Dict

from app.core.config import get_settings
from app.schemas.request import TripPlanRequest
from app.schemas.response import (
    BudgetSummary,
    TransportOption,
    StayOption,
    ItineraryResult
)

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Budget allocation ────────────────────────────────────────────────────────

def allocate_initial_budget(request: TripPlanRequest) -> BudgetSummary:
    """Initial budget split (pure Python logic)."""
    budget = request.budget
    
    trans_pct = settings.BUDGET_SPLIT_TRANSPORT
    stay_pct = settings.BUDGET_SPLIT_STAY
    activity_pct = settings.BUDGET_SPLIT_ACTIVITIES

    # Adjust based on group type and preferences
    prefs = (request.preferences or "").lower()
    group = request.group_type
    
    if group == "family":
        stay_pct = min(stay_pct + 0.15, 0.65)
        activity_pct = max(activity_pct - 0.05, 0.15)
    elif group == "solo":
        stay_pct = max(stay_pct - 0.1, 0.2)
        activity_pct = min(activity_pct + 0.1, 0.4)
    elif group == "couple":
        stay_pct = min(stay_pct + 0.05, 0.5)

    if "luxury" in prefs:
        stay_pct = min(stay_pct + 0.1, 0.7)
        trans_pct = max(trans_pct - 0.05, 0.2)
        activity_pct = 1.0 - trans_pct - stay_pct

    nights = (request.return_date - request.start_date).days or 1

    return BudgetSummary(
        total_budget=budget,
        allocated_transport=round(budget * trans_pct, 2),
        allocated_stay=round(budget * stay_pct * (nights/5.0), 2), 
        allocated_activities=round(budget * (1.0 - trans_pct - stay_pct), 2),
    )


# ── Result ranking ────────────────────────────────────────────────────────────

def rank_transport(
    raw_results: List[Dict[str, Any]],
    budget: float,
    max_results: int = 5
) -> List[TransportOption]:
    """Sort by price (ASC) then duration."""
    filtered = []
    # If raw_results is a dict from "results"
    items = raw_results if isinstance(raw_results, list) else raw_results.get("results", [])
    
    for item in items:
        price = item.get("price", float("inf"))
        if price <= budget:
            try:
                filtered.append(TransportOption(**_safe_pick(item, TransportOption)))
            except Exception:
                pass
                
    filtered.sort(key=lambda t: (t.price, t.duration_minutes or 9999))
    return filtered[:max_results]


def rank_stay(
    raw_results: List[Dict[str, Any]],
    budget_per_night: float,
    nights: int,
    max_results: int = 5
) -> List[StayOption]:
    """Sort by rating (DESC) then price (ASC)."""
    filtered = []
    items = raw_results if isinstance(raw_results, list) else raw_results.get("results", [])
    
    for item in items:
        ppn = item.get("price_per_night", float("inf"))
        if ppn <= budget_per_night:
            if "total_price" not in item:
                item["total_price"] = ppn * nights
            try:
                filtered.append(StayOption(**_safe_pick(item, StayOption)))
            except Exception:
                pass

    filtered.sort(key=lambda s: (-s.rating if s.rating else 0, s.price_per_night))
    return filtered[:max_results]


def compute_final_budget(
    budget_summary: BudgetSummary,
    transport: List[TransportOption],
    stay: List[StayOption],
    itinerary_cost: float = 0.0,
    travellers: int = 1
) -> BudgetSummary:
    """Final cost aggregation."""
    est_trans = transport[0].price if transport else 0.0
    est_stay = stay[0].total_price if stay else 0.0
    
    total = est_trans + est_stay + itinerary_cost
    
    budget_summary.estimated_transport_cost = round(est_trans, 2)
    budget_summary.estimated_stay_cost = round(est_stay, 2)
    budget_summary.estimated_activity_cost = round(itinerary_cost, 2)
    budget_summary.total_estimated_cost = round(total, 2)
    budget_summary.remaining_budget = round(budget_summary.total_budget - total, 2)
    budget_summary.cost_per_person = round(total / travellers, 2) if travellers > 0 else total
    budget_summary.within_budget = total <= budget_summary.total_budget
    return budget_summary


# ── Internal helpers ─────────────────────────────────────────────────────────

def _safe_pick(data: Dict, model_class: Any) -> Dict:
    """Keep only fields that exist in the pydantic model."""
    valid_fields = set(model_class.model_fields.keys())
    return {k: v for k, v in data.items() if k in valid_fields}


def is_low_quality(results: Any) -> bool:
    """Check for empty or unusable results."""
    if not results:
        return True
    if isinstance(results, list) and not results:
        return True
    if isinstance(results, dict) and not results.get("results") and not results.get("data"):
        return True
    return False
