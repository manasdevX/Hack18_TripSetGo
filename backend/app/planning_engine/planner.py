"""
Deterministic Trip Planning Engine — Core Orchestrator
=======================================================
Input → Validate → DestinationEngine → TransportEngine → StayEngine
      → ItineraryEngine → BudgetEngine → Optimizer → Output

NO LLM USED. Pure rule-based deterministic logic.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator

from .data import (
    DESTINATIONS,
    get_transport_options,
    get_stay_options,
    get_places_for_destination,
)
from app.services.weather_service import WeatherService


# ─────────────────────────────────────────────────────────────────────────────
# INPUT / OUTPUT SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class TripPlanInput(BaseModel):
    source: str = Field(..., min_length=2)
    destination: str = Field(..., min_length=2)
    start_date: date
    end_date: date
    budget: float = Field(..., gt=0)
    num_travelers: int = Field(default=1, ge=1, le=20)
    group_type: str = Field(default="friends")  # solo | couple | friends | family

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if info.data.get("start_date") and v <= info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v

    @field_validator("group_type")
    @classmethod
    def valid_group(cls, v):
        allowed = {"solo", "couple", "friends", "family"}
        return v.lower() if v.lower() in allowed else "friends"


class TripPlanResult(BaseModel):
    status: str  # success | partial | error
    destination: Dict[str, Any]
    transport: Dict[str, Any]
    stay: Dict[str, Any]
    itinerary: Dict[str, Any]
    budget: Dict[str, Any]
    alternatives: List[Dict[str, Any]]
    warnings: List[str]
    tips: List[str]
    planning_time_ms: float


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE MODULES
# ─────────────────────────────────────────────────────────────────────────────

class DestinationEngine:
    """Validates destination and enriches with metadata."""

    def process(self, destination: str, group_type: str, budget_per_person: float, start_date: date) -> Tuple[Dict, List[str]]:
        warnings: List[str] = []
        month = start_date.month

        # Find destination in DB (case-insensitive fuzzy match)
        matched_dest = None
        for d in DESTINATIONS:
            if (d["name"].lower() in destination.lower() or
                destination.lower() in d["name"].lower() or
                d["name"].lower() == destination.lower()):
                matched_dest = d
                break

        if not matched_dest:
            # Unknown destination — use defaults
            warnings.append(f"Destination '{destination}' not in our database. Using general estimates.")
            matched_dest = {
                "name": destination,
                "country": "Unknown",
                "tags": ["general"],
                "group_types": ["all"],
                "avg_cost_per_day": 2500,
                "best_months": list(range(1, 13)),
                "currency": "INR",
                "timezone": "Asia/Kolkata",
                "description": f"Trip to {destination}.",
                "highlights": [f"{destination} attractions"],
                "local_cuisine": ["Local cuisine"],
                "travel_tips": ["Research local customs", "Carry travel insurance"],
                "weather": "Varies by season.",
                "nearby_airports": [f"Nearest airport to {destination}"],
                "popularity_score": 70,
            }

        # Season check
        if month not in matched_dest.get("best_months", list(range(1, 13))):
            month_name = datetime(2000, month, 1).strftime("%B")
            best = [datetime(2000, m, 1).strftime("%B") for m in matched_dest.get("best_months", [])[:3]]
            warnings.append(
                f"⚠️ {month_name} is off-season for {matched_dest['name']}. "
                f"Best time: {', '.join(best)}."
            )

        # Group type compatibility check
        allowed = matched_dest.get("group_types", ["all"])
        if "all" not in allowed and group_type not in allowed:
            warnings.append(
                f"ℹ️ {matched_dest['name']} is typically popular with {', '.join(allowed)} groups."
            )

        # Budget check
        avg_daily = matched_dest.get("avg_cost_per_day", 2500)
        if budget_per_person < avg_daily * 0.6:
            warnings.append(
                f"💡 Budget seems low for {matched_dest['name']}. "
                f"Avg cost is ₹{avg_daily:,}/day per person. Consider ₹{avg_daily * 1.2:,.0f}+ for comfort."
            )

        return matched_dest, warnings


class TransportEngine:
    """Selects optimal transport mode based on budget and group constraints."""

    def process(
        self,
        source: str,
        destination: str,
        num_travelers: int,
        budget_for_transport: float,
    ) -> Dict[str, Any]:
        options = get_transport_options(source, destination, num_travelers)

        # Select recommended: within budget, or cheapest
        recommended = options[0]  # cheapest by default
        for opt in options:
            if opt["total_cost"] <= budget_for_transport:
                recommended = opt
                break

        # Score all options
        scored = []
        for opt in options:
            within = opt["total_cost"] <= budget_for_transport
            score = (
                (3 if within else -2)
                + opt.get("comfort_rating", 3) * 0.5
                - (opt["duration_hours"] * 0.1)
            )
            scored.append({**opt, "within_budget": within, "score": round(score, 2)})

        scored.sort(key=lambda x: -x["score"])

        return {
            "recommended": scored[0] if scored else recommended,
            "all_options": scored,
            "budget_allocated": round(budget_for_transport),
            "source": source,
            "destination": destination,
            "num_travelers": num_travelers,
        }


class StayEngine:
    """Selects stay options based on budget tier and travelers."""

    def process(
        self,
        destination: str,
        nights: int,
        num_travelers: int,
        budget_for_stay: float,
        group_type: str,
    ) -> Dict[str, Any]:
        budget_per_person = budget_for_stay / num_travelers
        all_options = get_stay_options(destination, nights, num_travelers, budget_per_person)

        # Select recommended tier based on group type and budget
        tier_preferences = {
            "solo": ["hostel", "budget_hotel", "mid_range", "premium", "luxury"],
            "couple": ["budget_hotel", "mid_range", "premium", "luxury", "hostel"],
            "friends": ["hostel", "budget_hotel", "mid_range", "premium", "luxury"],
            "family": ["mid_range", "premium", "luxury", "budget_hotel", "hostel"],
        }
        preferred_order = tier_preferences.get(group_type, tier_preferences["friends"])

        recommended = all_options[0]  # cheapest fallback

        # Try preferred tiers within budget
        for pref_tier in preferred_order:
            for opt in all_options:
                if opt["tier"] == pref_tier and opt["total_stay_cost"] <= budget_for_stay:
                    recommended = opt
                    break

        # Mark each option with within_budget flag
        scored = []
        for opt in all_options:
            within = opt["total_stay_cost"] <= budget_for_stay
            scored.append({**opt, "within_budget": within, "is_recommended": opt["tier"] == recommended["tier"]})

        return {
            "recommended": {**recommended, "is_recommended": True},
            "all_options": scored,
            "nights": nights,
            "budget_allocated": round(budget_for_stay),
        }


class ItineraryEngine:
    """Generates day-wise itinerary using rule-based scheduling."""

    def process(
        self,
        destination: str,
        num_days: int,
        start_date: date,
        group_type: str,
        transport_mode: str,
        places: List[Dict],
        weather_forecast: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        # Filter places for group type
        def place_matches(p: Dict) -> bool:
            gt = p.get("group_types", ["all"])
            return "all" in gt or group_type in gt

        eligible = [p for p in places if place_matches(p)]

        # Sort by type priority per group
        type_priority = {
            "solo": ["adventure", "nature", "culture", "heritage", "market", "beach"],
            "couple": ["beach", "nature", "culture", "heritage", "market", "adventure"],
            "friends": ["adventure", "beach", "nightlife", "market", "culture", "heritage"],
            "family": ["nature", "heritage", "culture", "market", "adventure", "beach"],
        }
        priority = type_priority.get(group_type, type_priority["friends"])

        def place_score(p: Dict) -> int:
            t = p.get("type", "other")
            try:
                return -(priority.index(t))
            except ValueError:
                return -99

        eligible.sort(key=place_score, reverse=True)

        # Build day-wise schedule
        # Rule: Day 1 = arrival + 1-2 nearby places; Days 2+ = 3-4 places; Last day = 1-2 places + departure
        days = []
        place_idx = 0

        for day_num in range(1, num_days + 1):
            current_date = start_date + timedelta(days=day_num - 1)
            day_label = current_date.strftime("%A, %d %B %Y")

            if num_days == 1:
                max_places = 3
                notes = f"Travel from {transport_mode} arrival + explore highlights."
            elif day_num == 1:
                max_places = 2
                notes = f"Arrival day. {transport_mode} journey + check-in. Easy start!"
            elif day_num == num_days:
                max_places = 2
                notes = "Last day — explore before checkout and departure."
            else:
                max_places = 4
                notes = "Full exploration day."

            # Pacing by group type
            if group_type == "family":
                max_places = min(max_places, 3)  # families move slower
            elif group_type == "solo":
                max_places = min(max_places + 1, 5)  # solo can move fast

            day_places = eligible[place_idx: place_idx + max_places]
            place_idx += max_places

            activities = []
            times = ["09:00 AM", "11:30 AM", "01:30 PM", "03:30 PM", "06:00 PM"]

            for i, place in enumerate(day_places):
                time_slot = times[i] if i < len(times) else "TBD"
                cost_note = f" (Entry: ₹{place['cost']:,})" if place.get("cost", 0) > 0 else " (Free entry)"
                activities.append({
                    "time": time_slot,
                    "place": place["name"],
                    "type": place.get("type", "general"),
                    "duration": f"{place.get('avg_time_hrs', 2)} hrs",
                    "best_time": place.get("best_time", ""),
                    "cost": place.get("cost", 0),
                    "description": f"Visit {place['name']}{cost_note}. Best time: {place.get('best_time', 'Morning')}.",
                })

            # Lunch/dinner slots
            if day_places:
                activities.insert(
                    min(2, len(activities)),
                    {
                        "time": "01:00 PM",
                        "place": "Local Restaurant",
                        "type": "food",
                        "duration": "1 hr",
                        "best_time": "Midday",
                        "cost": 0,
                        "description": "Lunch break — try local cuisine!",
                    }
                )
                activities.append({
                    "time": "08:00 PM",
                    "place": "Dinner at Local Restaurant",
                    "type": "food",
                    "duration": "1.5 hrs",
                    "best_time": "Evening",
                    "cost": 0,
                    "description": "Relax and enjoy dinner.",
                })

            days.append({
                "day": day_num,
                "date": day_label,
                "title": day_places[0]["name"] if day_places else f"Day {day_num} in {destination}",
                "theme": f"Day {day_num} — {destination}",
                "notes": notes,
                "activities": activities,
                "total_entry_cost": sum(p.get("cost", 0) for p in day_places),
                "weather": weather_forecast.get(current_date.isoformat()) if weather_forecast else None,
            })

        return {
            "days": days,
            "num_days": num_days,
            "destination": destination,
            "summary": f"{num_days}-day {group_type} trip to {destination} with {len([a for d in days for a in d['activities'] if a['type'] not in ('food',)])} curated experiences.",
            "travel_tips": [
                "Download offline maps before you travel",
                "Keep copies of all documents in cloud storage",
                "Respect local customs and dress codes",
                "Carry a small first-aid kit",
                "Stay hydrated especially in warm climates",
            ],
        }


class BudgetEngine:
    """Calculates comprehensive budget breakdown and alternatives."""

    def process(
        self,
        total_budget: float,
        num_travelers: int,
        nights: int,
        transport_cost: float,
        stay_cost: float,
        itinerary: Dict,
        group_type: str,
    ) -> Dict[str, Any]:
        budget_per_person = total_budget / num_travelers

        # Calculate activity costs from itinerary
        activity_cost = sum(
            a.get("cost", 0)
            for d in itinerary.get("days", [])
            for a in d.get("activities", [])
        ) / num_travelers  # per person

        # Per-day meal estimate (group-type based)
        meal_rates = {"solo": 500, "couple": 800, "friends": 700, "family": 600}
        daily_meals = meal_rates.get(group_type, 700)
        total_meals = daily_meals * nights * num_travelers

        # Miscellaneous (tips, transport within city, etc.)
        local_transport = 400 * nights * num_travelers
        misc = budget_per_person * 0.05 * num_travelers  # 5% buffer

        total_estimated = transport_cost + stay_cost + total_meals + local_transport + (activity_cost * num_travelers) + misc
        remaining = total_budget - total_estimated
        within_budget = remaining >= 0

        breakdown = {
            "transport": round(transport_cost),
            "accommodation": round(stay_cost),
            "meals": round(total_meals),
            "activities": round(activity_cost * num_travelers),
            "local_transport": round(local_transport),
            "miscellaneous": round(misc),
            "total_estimated": round(total_estimated),
        }

        per_person = {k: round(v / num_travelers) for k, v in breakdown.items()}

        return {
            "total_budget": round(total_budget),
            "total_estimated_cost": round(total_estimated),
            "remaining_budget": round(max(0, remaining)),
            "over_budget": round(max(0, -remaining)),
            "within_budget": within_budget,
            "budget_per_person": round(budget_per_person),
            "cost_per_person": round(total_estimated / num_travelers),
            "savings_per_person": round(max(0, remaining) / num_travelers),
            "breakdown": breakdown,
            "per_person_breakdown": per_person,
            "nights": nights,
            "num_travelers": num_travelers,
            "budget_utilization_pct": round((total_estimated / total_budget) * 100, 1),
        }


class Optimizer:
    """
    Iterative constraint solver.
    Adjusts transport/stay selection if total cost exceeds budget.
    """

    def optimize(
        self,
        budget: float,
        transport_result: Dict,
        stay_result: Dict,
        itinerary: Dict,
        num_travelers: int,
        nights: int,
        group_type: str,
    ) -> Tuple[Dict, Dict, List[str]]:
        """Try to fit within budget. Returns (transport, stay, suggestions)."""
        MAX_RETRIES = 3
        suggestions = []

        for attempt in range(MAX_RETRIES):
            t_cost = transport_result["recommended"]["total_cost"]
            s_cost = stay_result["recommended"]["total_stay_cost"]
            activity_cost = sum(
                a.get("cost", 0)
                for d in itinerary.get("days", [])
                for a in d.get("activities", [])
            )
            meal_cost = 700 * nights * num_travelers
            local_tx = 400 * nights * num_travelers
            total = t_cost + s_cost + activity_cost + meal_cost + local_tx

            if total <= budget:
                break

            overage = total - budget

            if attempt == 0:
                # Try cheaper transport
                all_transport = transport_result["all_options"]
                cheaper = [t for t in all_transport if t["total_cost"] < t_cost and t.get("within_budget")]
                if cheaper:
                    transport_result["recommended"] = cheaper[-1]
                    suggestions.append(f"💡 Switched to {cheaper[-1]['mode']} to reduce transport cost by ₹{t_cost - cheaper[-1]['total_cost']:,.0f}")
                    continue

            if attempt == 1:
                # Try cheaper stay tier
                all_stay = stay_result["all_options"]
                cheaper_stays = sorted(
                    [s for s in all_stay if s["total_stay_cost"] < s_cost],
                    key=lambda x: x["total_stay_cost"],
                    reverse=True
                )
                if cheaper_stays:
                    stay_result["recommended"] = cheaper_stays[0]
                    suggestions.append(
                        f"💡 Downgraded stay to {cheaper_stays[0]['type']} — saving ₹{s_cost - cheaper_stays[0]['total_stay_cost']:,.0f} on accommodation."
                    )
                    continue

            # Final: suggest budget increase
            suggestions.append(
                f"⚠️ Trip is over budget by ₹{overage:,.0f}. "
                f"Suggested budget: ₹{budget + overage * 1.1:,.0f}"
            )
            break

        return transport_result, stay_result, suggestions


# ─────────────────────────────────────────────────────────────────────────────
# MAIN PLANNER
# ─────────────────────────────────────────────────────────────────────────────

class TripPlanner:
    """
    Main deterministic trip planning orchestrator.

    Call flow:
      plan(input) → validate → destination → transport allocation → stay allocation
                 → itinerary → budget → optimize → alternatives → result
    """

    def __init__(self):
        self.destination_engine = DestinationEngine()
        self.transport_engine = TransportEngine()
        self.stay_engine = StayEngine()
        self.itinerary_engine = ItineraryEngine()
        self.budget_engine = BudgetEngine()
        self.optimizer = Optimizer()
        self.weather_service = WeatherService()

    def plan(self, inp: TripPlanInput) -> TripPlanResult:
        import time
        t0 = time.perf_counter()

        warnings: List[str] = []

        # ── 1. Basic metrics ──────────────────────────────────────────────
        nights = (inp.end_date - inp.start_date).days
        num_days = nights + 1
        budget_per_person = inp.budget / inp.num_travelers

        # ── 2. Destination Engine ─────────────────────────────────────────
        dest_info, dest_warnings = self.destination_engine.process(
            inp.destination, inp.group_type, budget_per_person, inp.start_date
        )
        warnings.extend(dest_warnings)

        # ── 3. Budget Allocation (rule-based split) ───────────────────────
        # Transport: 25-35% of budget
        # Stay: 35-45% of budget
        # Activities + meals + misc: remainder
        transport_share = 0.28
        stay_share = 0.40

        budget_transport = inp.budget * transport_share
        budget_stay = inp.budget * stay_share
        budget_activities = inp.budget * (1 - transport_share - stay_share)

        # ── 4. Transport Engine ───────────────────────────────────────────
        transport_result = self.transport_engine.process(
            inp.source, inp.destination, inp.num_travelers, budget_transport
        )

        # ── 5. Stay Engine ────────────────────────────────────────────────
        stay_result = self.stay_engine.process(
            inp.destination, nights, inp.num_travelers, budget_stay, inp.group_type
        )

        # ── 6. Places for itinerary ───────────────────────────────────────
        places = get_places_for_destination(inp.destination)

        # ── 6.5 Catch Actual Weather Forecast ────────────────────────────
        weather_data = self.weather_service.get_forecast_sync(inp.destination, inp.start_date, inp.end_date)

        # ── 7. Itinerary Engine ───────────────────────────────────────────
        itinerary = self.itinerary_engine.process(
            inp.destination,
            num_days,
            inp.start_date,
            inp.group_type,
            transport_result["recommended"]["mode"],
            places,
            weather_forecast=weather_data,
        )

        # ── 8. Optimizer (constraint solver) ──────────────────────────────
        transport_result, stay_result, opt_suggestions = self.optimizer.optimize(
            inp.budget, transport_result, stay_result, itinerary, inp.num_travelers, nights, inp.group_type
        )
        warnings.extend(opt_suggestions)

        # ── 9. Budget Engine ──────────────────────────────────────────────
        budget_result = self.budget_engine.process(
            inp.budget,
            inp.num_travelers,
            nights,
            transport_result["recommended"]["total_cost"],
            stay_result["recommended"]["total_stay_cost"],
            itinerary,
            inp.group_type,
        )

        # ── 10. Generate Alternative Plans ────────────────────────────────
        alternatives = self._generate_alternatives(inp, dest_info, transport_result, stay_result, nights)

        # ── 11. Compile tips ──────────────────────────────────────────────
        tips = dest_info.get("travel_tips", []) + itinerary.get("travel_tips", [])
        tips = list(dict.fromkeys(tips))[:7]  # deduplicate, max 7

        planning_time = (time.perf_counter() - t0) * 1000

        return TripPlanResult(
            status="success" if not any("⚠️" in w for w in warnings) else "partial",
            destination={
                "name": dest_info["name"],
                "country": dest_info.get("country", ""),
                "description": dest_info.get("description", ""),
                "highlights": dest_info.get("highlights", []),
                "local_cuisine": dest_info.get("local_cuisine", []),
                "weather": dest_info.get("weather", ""),
                "nearby_airports": dest_info.get("nearby_airports", []),
                "tags": dest_info.get("tags", []),
                "best_months": dest_info.get("best_months", []),
                "popularity_score": dest_info.get("popularity_score", 70),
                "currency": dest_info.get("currency", "INR"),
                "nights": nights,
                "num_days": num_days,
                "num_travelers": inp.num_travelers,
                "group_type": inp.group_type,
                "start_date": inp.start_date.isoformat(),
                "end_date": inp.end_date.isoformat(),
            },
            transport=transport_result,
            stay=stay_result,
            itinerary=itinerary,
            budget=budget_result,
            alternatives=alternatives,
            warnings=[w for w in warnings if w],
            tips=tips,
            planning_time_ms=round(planning_time, 2),
        )

    def _generate_alternatives(
        self,
        inp: TripPlanInput,
        dest_info: Dict,
        base_transport: Dict,
        base_stay: Dict,
        nights: int,
    ) -> List[Dict]:
        """Generate 3 alternative plan variants."""
        alternatives = []
        all_transport = base_transport.get("all_options", [])
        all_stay = base_stay.get("all_options", [])

        # Variant A: Budget — cheapest transport + hostel/budget
        budget_transport = min(all_transport, key=lambda x: x["cost_per_person"]) if all_transport else base_transport["recommended"]
        budget_stay = next(
            (s for s in sorted(all_stay, key=lambda x: x["total_stay_cost"])
             if s["tier"] in ("hostel", "budget_hotel")),
            all_stay[0] if all_stay else base_stay["recommended"]
        )
        t_cost_a = budget_transport.get("total_cost", 0)
        s_cost_a = budget_stay.get("total_stay_cost", 0)
        total_a = t_cost_a + s_cost_a + (600 * nights * inp.num_travelers)
        alternatives.append({
            "variant": "A",
            "label": "💰 Budget Traveler",
            "description": "Maximum savings — best for backpackers.",
            "transport": budget_transport.get("mode", ""),
            "stay": budget_stay.get("name", ""),
            "stay_tier": budget_stay.get("tier", ""),
            "estimated_total": round(total_a),
            "cost_per_person": round(total_a / inp.num_travelers),
            "savings": round(max(0, inp.budget - total_a)),
        })

        # Variant B: Comfort — mid-range everything
        mid_stay = next(
            (s for s in all_stay if s["tier"] == "mid_range"),
            base_stay["recommended"]
        )
        # Pick mid-transport (second cheapest)
        mid_transport = all_transport[1] if len(all_transport) > 1 else base_transport["recommended"]
        t_cost_b = mid_transport.get("total_cost", 0)
        s_cost_b = mid_stay.get("total_stay_cost", 0)
        total_b = t_cost_b + s_cost_b + (1000 * nights * inp.num_travelers)
        alternatives.append({
            "variant": "B",
            "label": "✨ Comfort Seeker",
            "description": "Best balance of comfort and value.",
            "transport": mid_transport.get("mode", ""),
            "stay": mid_stay.get("name", ""),
            "stay_tier": mid_stay.get("tier", ""),
            "estimated_total": round(total_b),
            "cost_per_person": round(total_b / inp.num_travelers),
            "savings": round(max(0, inp.budget - total_b)),
        })

        # Variant C: Luxury — flight + premium/luxury stay
        luxury_transport = next((t for t in all_transport if t["mode"] == "Flight"), all_transport[0] if all_transport else base_transport["recommended"])
        luxury_stay = next(
            (s for s in sorted(all_stay, key=lambda x: -x["total_stay_cost"])
             if s["tier"] in ("luxury", "premium")),
            all_stay[-1] if all_stay else base_stay["recommended"]
        )
        t_cost_c = luxury_transport.get("total_cost", 0)
        s_cost_c = luxury_stay.get("total_stay_cost", 0)
        total_c = t_cost_c + s_cost_c + (2500 * nights * inp.num_travelers)
        alternatives.append({
            "variant": "C",
            "label": "👑 Luxury Experience",
            "description": "Premium all-round — treat yourself!",
            "transport": luxury_transport.get("mode", ""),
            "stay": luxury_stay.get("name", ""),
            "stay_tier": luxury_stay.get("tier", ""),
            "estimated_total": round(total_c),
            "cost_per_person": round(total_c / inp.num_travelers),
            "savings": round(max(0, inp.budget - total_c)),
        })

        return alternatives
