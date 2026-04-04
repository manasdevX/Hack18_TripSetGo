"""
TripSetGo LLM-Based Interactive Planner — RAG Edition
=======================================================
Uses vector_store.py for retrieval-augmented context injection.
"""
from __future__ import annotations
import json, logging, re, time
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
import httpx, asyncio as _asyncio

from app.core.config import settings
from app.planning_engine.vector_store import retrieve_context, build_vector_context_string, VECTOR_DATA
from app.planning_engine.data import get_transport_options, get_stay_options, get_places_for_destination

logger = logging.getLogger(__name__)

# ─── Groq client ──────────────────────────────────────────────────────────────

async def _call_groq(messages: List[Dict], max_tokens: int = 7000) -> Optional[str]:
    if not settings.GROQ_API_KEY:
        return None
    payload = {"model": settings.GROQ_MODEL, "messages": messages, "temperature": 0.4, "max_tokens": max_tokens}
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=60.0) as c:
                r = await c.post(f"{settings.GROQ_BASE_URL}/chat/completions", json=payload, headers=headers)
                if r.status_code == 429:
                    await _asyncio.sleep(2 ** attempt)
                    continue
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < 2:
                await _asyncio.sleep(2 ** attempt); continue
            logger.error("[LLM] HTTP error: %s", e); return None
        except Exception as e:
            logger.error("[LLM] error: %s", e); return None
    return None


def _extract_json(raw: str) -> Dict:
    if not raw: return {}
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()
    try: return json.loads(cleaned)
    except Exception:
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if m:
            try: return json.loads(m.group())
            except: pass
    return {}

# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are TripSetGo AI — an elite interactive travel planner using RAG (Retrieval-Augmented Generation).

CRITICAL RULES:
1. ONLY use data from the provided RETRIEVED CONTEXT — never hallucinate
2. If data is missing from context → say "No data available in database" for that field
3. Return ONLY valid JSON — no markdown fences, no explanation
4. All prices must be integers in INR
5. Use the exact IDs from the context (tx_001, ht_002, ac_003, fp_004, etc.)

OUTPUT SCHEMA (return this exactly):
{
  "meta": {"source":"","destination":"","total_days":0,"total_nights":0,"num_travelers":0,"group_type":"","total_budget":0,"theme":"","tags":[],"summary_text":""},
  "transport_options": [{"id":"","mode":"","provider":"","cost_per_person":0,"total_cost":0,"duration":"","comfort":0,"highlights":[],"recommended":false,"best_for":""}],
  "hotel_options": [{"id":"","name":"","tier":"","price_per_night":0,"total_stay_cost":0,"rating":0,"location":"","amenities":[],"best_for":"","recommended":false}],
  "food_plans": [{"id":"","name":"","description":"","cost_per_day":0,"total_cost":0,"highlights":[],"recommended":false}],
  "itinerary": [{"day":0,"date":"","day_summary":"","morning":{"time":"08:00 AM","activities":[{"id":"","name":"","type":"","duration":"","cost":0,"location":"","description":"","tags":[]}]},"afternoon":{"time":"01:00 PM","activities":[]},"evening":{"time":"06:00 PM","activities":[]}}],
  "budget_breakdown_estimate": {"transport":0,"stay":0,"food":0,"activities":0,"misc":0,"total":0},
  "ai_suggestions": [{"type":"","icon":"","title":"","description":"","potential_cost":0}],
  "ui": {"color_primary":"#6366f1","destination_vibe":"city"}
}

ACTIVITY RULES:
- 3 options per slot (morning/afternoon/evening) per day
- Use activity IDs from context (ac_xxx) for real activities
- Day 1 morning: include Arrival & Check-in as first option
- Last day morning: include Checkout & Departure as first option
- Mix categories: adventure, culture, relaxation, food, nature"""


async def generate_interactive_plan(
    source: str, destination: str, start_date: date, end_date: date,
    budget: float, num_travelers: int, group_type: str, preferences: List[str] = None,
) -> Dict[str, Any]:
    t0 = time.perf_counter()
    preferences = preferences or []
    nights = (end_date - start_date).days
    num_days = nights + 1

    # ── RAG: Retrieve context from vector store ────────────────────────────
    rag_ctx = retrieve_context(
        destination=destination, budget=budget, num_days=num_days,
        num_travelers=num_travelers, preferences=preferences,
        group_type=group_type, source=source,
    )
    context_str = build_vector_context_string(rag_ctx)

    date_list = [(start_date + timedelta(days=i)).isoformat() for i in range(num_days)]

    user_msg = f"""Generate an INTERACTIVE RAG-based trip plan.

TRIP INPUT:
- Source: {source} → Destination: {destination}
- Dates: {start_date} to {end_date} ({num_days} days, {nights} nights)
- Budget: ₹{budget:,.0f} total for {num_travelers} travelers (₹{budget/num_travelers:,.0f}/person)
- Group: {num_travelers} {group_type}
- Preferences: {', '.join(preferences) or 'general sightseeing, food, culture'}
- Day dates: {date_list}

{context_str}

INSTRUCTIONS:
1. transport_options: use ONLY transport entries from context (3–5 options, use their exact IDs)
2. hotel_options: use ONLY hotel entries from context (4–5 tiers, budget to luxury)
3. food_plans: use ONLY food entries from context OR create 3 tiers if none found
4. Each day: 3-4 options per morning/afternoon/evening slot, use activity IDs from context
5. Mark best-value options as recommended=true
6. budget_breakdown_estimate should sum to ≈ ₹{budget:,.0f}
7. ai_suggestions: 4 targeted tips based on budget and {destination}

Generate the complete JSON now:"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]

    raw = await _call_groq(messages)
    plan = _extract_json(raw) if raw else {}
    elapsed = (time.perf_counter() - t0) * 1000

    if plan and plan.get("meta") and plan.get("itinerary"):
        plan = _patch_plan(plan, source, destination, budget, num_travelers, nights, rag_ctx)
        plan["_meta"] = {"planning_time_ms": round(elapsed, 1), "llm_used": True, "model": settings.GROQ_MODEL, "rag_retrieved": rag_ctx["retrieved_count"], "vector_store_size": rag_ctx["vector_data_count"]}
        logger.info("[Planner] ✓ LLM+RAG success %.0fms | retrieved=%d", elapsed, rag_ctx["retrieved_count"])
        return plan

    logger.warning("[Planner] LLM failed — deterministic fallback")
    return _deterministic_fallback(source, destination, start_date, end_date, budget, num_travelers, group_type, nights, num_days, date_list, rag_ctx, elapsed)


def _patch_plan(plan, source, destination, budget, num_travelers, nights, rag_ctx):
    meta = plan.setdefault("meta", {})
    meta.setdefault("source", source); meta.setdefault("destination", destination)
    meta.setdefault("total_days", nights + 1); meta.setdefault("total_nights", nights)
    meta.setdefault("num_travelers", num_travelers); meta.setdefault("total_budget", budget)
    meta.setdefault("tags", []); meta.setdefault("summary_text", f"An unforgettable trip to {destination}!")

    # Patch transport defaults
    for i, t in enumerate(plan.get("transport_options", [])):
        t.setdefault("id", f"tx_{i:03d}"); t.setdefault("recommended", i == 1); t.setdefault("highlights", [])

    # Fill from RAG if LLM returned empty lists
    by_type = rag_ctx["by_type"]
    if not plan.get("transport_options"):
        plan["transport_options"] = [_rag_to_transport(e, i, num_travelers) for i, e in enumerate(by_type.get("transport", [])[:5])]
    if not plan.get("hotel_options"):
        plan["hotel_options"] = [_rag_to_hotel(e, i, nights) for i, e in enumerate(by_type.get("hotel", [])[:6])]
    if not plan.get("food_plans"):
        plan["food_plans"] = _default_food_plans(destination, num_travelers, nights + 1)

    plan.setdefault("ai_suggestions", _default_suggestions(destination, budget, nights))
    ui = plan.setdefault("ui", {}); ui.setdefault("color_primary", "#6366f1"); ui.setdefault("destination_vibe", "city")

    bb = plan.setdefault("budget_breakdown_estimate", {})
    tx = next((t["total_cost"] for t in plan.get("transport_options", []) if t.get("recommended")), budget * 0.15)
    ht = next((h["total_stay_cost"] for h in plan.get("hotel_options", []) if h.get("recommended")), budget * 0.35)
    fd = next((f["total_cost"] for f in plan.get("food_plans", []) if f.get("recommended")), 700 * num_travelers * (nights + 1))
    bb.setdefault("transport", int(tx)); bb.setdefault("stay", int(ht)); bb.setdefault("food", int(fd))
    bb.setdefault("activities", int(budget * 0.12)); bb.setdefault("misc", int(budget * 0.05))
    bb["total"] = sum(v for k, v in bb.items() if k != "total")
    return plan


def _rag_to_transport(e, i, num_travelers):
    return {"id": e["id"], "mode": e.get("name", e.get("category", "Flight")).split()[0], "provider": e["name"], "cost_per_person": int(e["price"]), "total_cost": int(e["price"] * num_travelers), "duration": e["duration"], "comfort": e.get("metadata", {}).get("comfort", 3), "highlights": e.get("tags", [])[:2], "recommended": i == 1, "best_for": e.get("metadata", {}).get("best_for", "")}

def _rag_to_hotel(e, i, nights):
    return {"id": e["id"], "name": e["name"], "tier": e.get("category", "mid_range"), "price_per_night": int(e["price"]), "total_stay_cost": int(e["price"] * nights), "rating": e.get("rating", 4.0), "location": e.get("metadata", {}).get("location", "City Center"), "amenities": e.get("metadata", {}).get("amenities", ["WiFi", "AC"]), "best_for": e.get("tags", ["all travelers"])[0], "recommended": i == 2}

def _default_food_plans(destination, num_travelers, days):
    return [
        {"id": "food_budget", "name": "Budget Local Eats", "description": f"Street food, local dhabas and cafes in {destination}", "cost_per_day": 350 * num_travelers, "total_cost": 350 * num_travelers * days, "highlights": ["Street food", "Local chai", "Authentic flavours"], "recommended": False},
        {"id": "food_balanced", "name": "Balanced Cafe & Restaurant", "description": "Cafes, mid-range restaurants and local specialties", "cost_per_day": 700 * num_travelers, "total_cost": 700 * num_travelers * days, "highlights": ["Cafes", "Regional cuisine", "Rooftop dining"], "recommended": True},
        {"id": "food_premium", "name": "Fine Dining Experience", "description": "Premium restaurants and curated food experiences", "cost_per_day": 1500 * num_travelers, "total_cost": 1500 * num_travelers * days, "highlights": ["Fine dining", "Chef's specials", "Wine & cocktails"], "recommended": False},
    ]

def _default_suggestions(destination, budget, nights):
    return [
        {"type": "tip", "icon": "💡", "title": "Book 2+ weeks early", "description": "Save 20–30% on hotels and transport.", "potential_cost": 0},
        {"type": "upgrade", "icon": "⬆️", "title": "Upgrade your hotel", "description": f"A premium stay in {destination} adds only ₹{2500 * nights:,} but transforms your experience.", "potential_cost": 2500 * nights},
        {"type": "tip", "icon": "🗺️", "title": "Download offline maps", "description": "Use Google Maps offline to navigate without data.", "potential_cost": 0},
        {"type": "warning", "icon": "⚠️", "title": "Check visa & permits", "description": f"Some areas near {destination} may require advance permits.", "potential_cost": 0},
    ]


def _deterministic_fallback(source, destination, start_date, end_date, budget, num_travelers, group_type, nights, num_days, date_list, rag_ctx, elapsed):
    import itertools
    by_type = rag_ctx["by_type"]
    acts = by_type.get("activity", [])

    if not acts:
        acts = [{"id": f"ac_gen_{i}", "name": n, "type": t, "price": p, "duration": d, "city": destination, "tags": tg, "metadata": {"best_time": bt}} for i, (n, t, p, d, tg, bt) in enumerate([
            ("City Exploration", "culture", 0, "2 hrs", ["culture", "morning"], "Morning"),
            ("Local Market Walk", "shopping", 0, "1.5 hrs", ["local", "morning"], "Morning"),
            ("Heritage Site", "heritage", 200, "2 hrs", ["heritage", "afternoon"], "Afternoon"),
            ("Viewpoint Trek", "adventure", 0, "2 hrs", ["nature", "afternoon"], "Afternoon"),
            ("Sunset Point", "nature", 0, "1 hr", ["sunset", "evening"], "Evening"),
            ("Local Dinner", "food", 800, "2 hrs", ["food", "evening"], "Evening"),
        ])]

    pool = list(itertools.islice(itertools.cycle(acts), num_days * 9 + 9))

    def _act(raw, slot, day_num, idx):
        return {"id": raw.get("id", f"act_d{day_num}_{slot}_{idx}"), "name": raw.get("name", "Activity"), "type": raw.get("category", raw.get("type", "culture")), "duration": raw.get("duration", "2 hrs"), "cost": int(raw.get("price", 0)), "location": raw.get("city", destination), "description": f"Visit {raw.get('name','this attraction')} in {destination}.", "tags": raw.get("tags", [])[:3]}

    itinerary = []
    for d in range(num_days):
        base = d * 9
        morn = [_act(pool[base + i], "m", d+1, i) for i in range(3)]
        aft  = [_act(pool[base + 3 + i], "a", d+1, i) for i in range(3)]
        eve  = [_act(pool[base + 6 + i], "e", d+1, i) for i in range(3)]
        if d == 0:           morn[0] = {"id": "act_arrival", "name": "Arrival & Check-in", "type": "relaxation", "duration": "2 hrs", "cost": 0, "location": destination, "description": "Arrive, check in, freshen up.", "tags": ["arrival"]}
        if d == num_days-1:  morn[0] = {"id": "act_checkout", "name": "Checkout & Departure", "type": "relaxation", "duration": "2 hrs", "cost": 0, "location": source, "description": "Check out and head to departure.", "tags": ["departure"]}
        itinerary.append({"day": d+1, "date": date_list[d], "day_summary": f"Day {d+1} in {destination}", "morning": {"time": "08:00 AM", "activities": morn}, "afternoon": {"time": "01:00 PM", "activities": aft}, "evening": {"time": "06:00 PM", "activities": eve}})

    transport_options = [_rag_to_transport(e, i, num_travelers) for i, e in enumerate(by_type.get("transport", [])[:5])]
    if not transport_options:
        transport_options = [{"id": "tx_default", "mode": "Flight", "provider": "Domestic Carrier", "cost_per_person": 5500, "total_cost": 5500 * num_travelers, "duration": "2h", "comfort": 4, "highlights": ["Fast"], "recommended": True, "best_for": "Speed"}]

    hotel_options = [_rag_to_hotel(e, i, nights) for i, e in enumerate(by_type.get("hotel", [])[:6])]
    if not hotel_options:
        hotel_options = [{"id": "ht_default", "name": f"Standard Hotel {destination}", "tier": "mid_range", "price_per_night": 2500, "total_stay_cost": 2500 * nights, "rating": 4.0, "location": destination, "amenities": ["WiFi", "AC", "Pool"], "best_for": "All travelers", "recommended": True}]

    bb = {"transport": transport_options[0]["total_cost"], "stay": hotel_options[min(2, len(hotel_options)-1)]["total_stay_cost"], "food": 700 * num_travelers * num_days, "activities": int(budget * 0.12), "misc": int(budget * 0.05)}
    bb["total"] = sum(bb.values())

    return {
        "meta": {"source": source, "destination": destination, "total_days": num_days, "total_nights": nights, "num_travelers": num_travelers, "group_type": group_type, "total_budget": budget, "theme": "balanced", "tags": ["sightseeing", "culture", "food"], "summary_text": f"Discover the best of {destination} in {num_days} days!"},
        "transport_options": transport_options,
        "hotel_options": hotel_options,
        "food_plans": _default_food_plans(destination, num_travelers, num_days),
        "itinerary": itinerary,
        "budget_breakdown_estimate": bb,
        "ai_suggestions": _default_suggestions(destination, budget, nights),
        "ui": {"color_primary": "#6366f1", "destination_vibe": "city"},
        "_meta": {"planning_time_ms": round(elapsed, 1), "llm_used": False, "model": "deterministic-rag-fallback", "rag_retrieved": rag_ctx["retrieved_count"], "vector_store_size": rag_ctx["vector_data_count"]},
    }
