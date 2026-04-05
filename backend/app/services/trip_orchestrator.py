"""
Trip Orchestrator Service — Calls the LLM orchestrator service or falls back to
the deterministic planning engine. Normalizes the response to a consistent shape.
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.planning_engine import TripPlanner, TripPlanInput

logger = logging.getLogger(__name__)

# Singleton deterministic planner (fast fallback)
_det_planner = TripPlanner()


async def plan_trip_with_orchestrator(payload: dict) -> dict:
    """
    Try the LLM orchestrator first; if unreachable or slow, fall back to
    the deterministic engine. Always returns a dict.
    """
    # Normalize date fields
    start_date = payload.get("start_date") or payload.get("start_date")
    return_date = payload.get("return_date") or payload.get("end_date")

    try:
        result = await _call_orchestrator(payload)
        if result:
            return _normalize_orchestrator_response(result, payload)
    except Exception as exc:
        logger.warning("[ORCHESTRATOR] LLM pipeline failed (%s), using deterministic fallback", exc)

    # Deterministic fallback
    return _run_deterministic(payload, start_date, return_date)


async def _call_orchestrator(payload: dict) -> Optional[dict]:
    """Call the running orchestrator service via HTTP."""
    orchestrator_url = getattr(settings, "ORCHESTRATOR_URL", "http://localhost:8004")
    
    # Map to orchestrator's TripPlanRequest schema
    orchestrator_payload = {
        "source": payload.get("source", ""),
        "destination": payload.get("destination", ""),
        "start_date": str(payload.get("start_date", "")),
        "return_date": str(payload.get("return_date", payload.get("end_date", ""))),
        "budget": float(payload.get("budget", 0)),
        "travellers": int(payload.get("travellers", payload.get("num_travelers", 1))),
        "group_type": payload.get("trip_type", payload.get("group_type", "friends")),
        "preferences": _build_preferences_string(payload),
        "replan": False,
        "use_cache": True,
        "use_api": False,
        "use_web_fallback": False,
    }

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            f"{orchestrator_url}/api/v1/plan",
            json=orchestrator_payload
        )
        resp.raise_for_status()
        return resp.json()


def _build_preferences_string(payload: dict) -> str:
    """Convert rich form fields into a preferences string for the orchestrator."""
    parts = []
    if payload.get("vibes"):
        vibes = payload["vibes"]
        if isinstance(vibes, list):
            parts.append(f"Vibes: {', '.join(vibes)}")
        else:
            parts.append(f"Vibes: {vibes}")
    if payload.get("accommodation_pref"):
        parts.append(f"Accommodation: {payload['accommodation_pref']}")
    if payload.get("meal_preference"):
        parts.append(f"Meal: {payload['meal_preference']}")
    if payload.get("must_do"):
        parts.append(f"Must do: {payload['must_do']}")
    if payload.get("avoid"):
        parts.append(f"Avoid: {payload['avoid']}")
    if payload.get("physical_ability"):
        parts.append(f"Physical ability: {payload['physical_ability']}")
    if payload.get("previously_visited"):
        parts.append("Previously visited — skip the obvious tourist spots")
    if payload.get("travel_style_notes"):
        parts.append(f"Style: {payload['travel_style_notes']}")
    if payload.get("special_requirements"):
        parts.append(f"Special needs: {payload['special_requirements']}")
    return " | ".join(parts) if parts else ""


def _normalize_orchestrator_response(raw: dict, payload: dict) -> dict:
    """Normalize orchestrator response to our standard trip data shape."""
    # The orchestrator returns: { status, data: { destination_context, transport, stay, itinerary, budget_summary, navigation }, ... }
    data = raw.get("data", {}) or {}
    dest_ctx = data.get("destination_context") or {}

    # Compute duration
    start_date = str(payload.get("start_date", ""))
    return_date = str(payload.get("return_date", payload.get("end_date", "")))
    duration_days = 3
    try:
        d1 = datetime.fromisoformat(start_date)
        d2 = datetime.fromisoformat(return_date)
        duration_days = max(1, (d2 - d1).days)
    except Exception:
        pass

    transport_list = data.get("transport") or []
    stay_list = data.get("stay") or []
    itinerary_data = data.get("itinerary") or {}
    budget_summary = data.get("budget_summary") or {}

    return {
        "status": raw.get("status", "success"),
        "planning_time_ms": raw.get("total_latency_ms", 0),
        "destination": {
            "name": dest_ctx.get("destination", payload.get("destination", "")),
            "country": "India",
            "num_days": duration_days,
            "nights": duration_days - 1,
            "num_travelers": int(payload.get("travellers", payload.get("num_travelers", 1))),
            "description": dest_ctx.get("local_tips", ""),
            "weather": _fmt_weather(dest_ctx.get("weather_summary", "")),
            "highlights": dest_ctx.get("top_attractions", []),
            "local_cuisine": dest_ctx.get("local_cuisine", []),
            "tags": dest_ctx.get("areas", []),
        },
        "transport": {
            "recommended": _fmt_transport_item(transport_list[0] if transport_list else None, payload),
            "all_options": [_fmt_transport_item(t, payload) for t in transport_list],
        },
        "stay": {
            "recommended": _fmt_stay_item(stay_list[0] if stay_list else None, payload),
            "all_options": [_fmt_stay_item(s, payload) for s in stay_list],
            "nights": duration_days - 1,
        },
        "itinerary": _fmt_itinerary(itinerary_data, payload),
        "budget": _fmt_budget(budget_summary, payload, duration_days),
        "alternatives": [],  # Orchestrator doesn't generate alternatives
        "warnings": raw.get("warnings", []),
        "tips": _extract_tips(dest_ctx),
    }


def _fmt_weather(weather_summary: str) -> str:
    return weather_summary or "Expect pleasant conditions. Check local forecast."


def _fmt_transport_item(t: Any, payload: dict) -> dict:
    if not t:
        return {
            "mode": "Flight",
            "provider": "IndiGo / Air India",
            "duration_hours": 2,
            "total_cost": round(float(payload.get("budget", 0)) * 0.35),
            "cost_per_person": round(float(payload.get("budget", 0)) * 0.35 / max(int(payload.get("travellers", payload.get("num_travelers", 1))), 1)),
            "comfort_rating": 4,
            "best_for": "All travellers",
            "details": "Fastest option for this route",
        }
    if hasattr(t, "model_dump"):
        t = t.model_dump()
    duration_h = round((t.get("duration_minutes") or 120) / 60, 1)
    travellers = int(payload.get("travellers", payload.get("num_travelers", 1)))
    price = float(t.get("price") or 0)
    return {
        "mode": t.get("mode", "Flight"),
        "provider": t.get("provider", ""),
        "route_number": t.get("route_number", ""),
        "duration_hours": duration_h,
        "total_cost": price,
        "cost_per_person": round(price / max(travellers, 1)),
        "comfort_rating": 4,
        "best_for": t.get("class_type", "Economy"),
        "details": f"{t.get('departure', '')} → {t.get('arrival', '')}",
        "booking_tip": t.get("booking_tip", ""),
    }


def _fmt_stay_item(s: Any, payload: dict) -> dict:
    if not s:
        return {
            "name": "Recommended Hotel",
            "type": "hotel",
            "privacy": "private room",
            "area": payload.get("destination", "City Center"),
            "rating": 4.0,
            "rooms_required": 1,
            "price_per_room_per_night": round(float(payload.get("budget", 0)) * 0.25 / 3),
            "total_stay_cost": round(float(payload.get("budget", 0)) * 0.25),
            "amenities": ["WiFi", "AC", "Hot Water"],
            "is_recommended": True,
            "tier": "mid_range",
        }
    if hasattr(s, "model_dump"):
        s = s.model_dump()
    return {
        "name": s.get("name", "Hotel"),
        "type": s.get("type", "hotel").lower() if s.get("type") else "hotel",
        "privacy": "private room",
        "area": s.get("area", "City Center"),
        "rating": float(s.get("rating") or 4.0),
        "rooms_required": 1,
        "price_per_room_per_night": float(s.get("price_per_night") or 0),
        "total_stay_cost": float(s.get("total_price") or 0),
        "amenities": s.get("amenities") or [],
        "is_recommended": True,
        "tier": "mid_range",
    }


def _fmt_itinerary(iti: Any, payload: dict) -> dict:
    if hasattr(iti, "model_dump"):
        iti = iti.model_dump()
    if not iti or not isinstance(iti, dict):
        return {"days": [], "summary": ""}

    days = iti.get("days") or []
    formatted_days = []
    for day in days:
        if hasattr(day, "model_dump"):
            day = day.model_dump()
        if not isinstance(day, dict):
            continue
        activities = day.get("activities") or []
        formatted_activities = []
        for act in activities:
            if isinstance(act, dict):
                formatted_activities.append({
                    "time": act.get("time", ""),
                    "place": act.get("task", "")[:50] if act.get("task") else "",
                    "description": act.get("task", ""),
                    "type": "general",
                    "duration": "",
                })
            elif isinstance(act, str):
                formatted_activities.append({
                    "time": "",
                    "place": act[:50],
                    "description": act,
                    "type": "general",
                    "duration": "",
                })
        formatted_days.append({
            "day": day.get("day_number") or day.get("day") or 1,
            "title": day.get("title", f"Day {day.get('day_number', 1)}"),
            "date": payload.get("start_date", ""),
            "notes": day.get("notes", "") or "",
            "activities": formatted_activities,
            "weather": day.get("weather"),
        })

    return {
        "days": formatted_days,
        "summary": iti.get("summary") or iti.get("travel_tips", "") or "",
    }


def _fmt_budget(bs: Any, payload: dict, duration_days: int) -> dict:
    if hasattr(bs, "model_dump"):
        bs = bs.model_dump()
    if not bs or not isinstance(bs, dict):
        bs = {}

    total_budget = float(payload.get("budget", 0))
    travellers = int(payload.get("travellers", payload.get("num_travelers", 1)))
    estimated = float(bs.get("total_estimated_cost") or total_budget * 0.85)
    remaining = total_budget - estimated

    return {
        "total_budget": total_budget,
        "total_estimated_cost": estimated,
        "remaining_budget": remaining,
        "cost_per_person": round(estimated / max(travellers, 1)),
        "within_budget": remaining >= 0,
        "over_budget": max(0, -remaining),
        "budget_utilization_pct": round((estimated / total_budget * 100) if total_budget > 0 else 0),
        "allocated_transport": bs.get("allocated_transport") or round(total_budget * 0.35),
        "allocated_stay": bs.get("allocated_stay") or round(total_budget * 0.30),
        "allocated_activities": bs.get("allocated_activities") or round(total_budget * 0.20),
        "breakdown": {
            "transport": bs.get("estimated_transport_cost") or round(total_budget * 0.35),
            "accommodation": bs.get("estimated_stay_cost") or round(total_budget * 0.30),
            "meals": round(total_budget * 0.20),
            "activities": round(total_budget * 0.10),
            "local_transport": round(total_budget * 0.03),
            "miscellaneous": round(total_budget * 0.02),
        },
        "per_person_breakdown": {
            "transport": round((bs.get("estimated_transport_cost") or total_budget * 0.35) / max(travellers, 1)),
            "accommodation": round((bs.get("estimated_stay_cost") or total_budget * 0.30) / max(travellers, 1)),
            "meals": round(total_budget * 0.20 / max(travellers, 1)),
            "activities": round(total_budget * 0.10 / max(travellers, 1)),
        },
    }


def _extract_tips(dest_ctx: dict) -> list:
    """Extract actionable tips from destination context."""
    tips_str = dest_ctx.get("local_tips", "")
    if not tips_str:
        return []
    # Split on pipe separator used in our destination agent
    tips = [t.strip() for t in tips_str.split("|") if t.strip()]
    return tips[:5]


def _run_deterministic(payload: dict, start_date: str, return_date: str) -> dict:
    """Run the deterministic planning engine as fallback."""
    from datetime import date as date_type
    try:
        sd = date_type.fromisoformat(str(start_date))
    except Exception:
        sd = date_type.today()
    try:
        ed = date_type.fromisoformat(str(return_date))
    except Exception:
        from datetime import timedelta
        ed = sd + timedelta(days=3)

    plan_input = TripPlanInput(
        source=payload.get("source", "Mumbai"),
        destination=payload.get("destination", ""),
        start_date=sd,
        end_date=ed,
        budget=float(payload.get("budget", 10000)),
        num_travelers=int(payload.get("travellers", payload.get("num_travelers", 1))),
        group_type=payload.get("trip_type", payload.get("group_type", "friends")),
    )
    result = _det_planner.plan(plan_input)
    return result.model_dump()
