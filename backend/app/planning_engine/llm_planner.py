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
from app.planning_engine.vector_store import (
    retrieve_context, build_vector_context_string, VECTOR_DATA,
    retrieve_real_trains, retrieve_real_restaurants, build_enriched_context_string,
)
from app.planning_engine.data import get_transport_options, get_stay_options, get_places_for_destination
from app.services.weather_service import WeatherService

_weather_service = WeatherService()

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
  "ai_suggestions": [
     {"type":"upgrade|tip|warning|romantic|adventure|weather","icon":"emoji","title":"","description":"","potential_cost":0}
  ],
  "ui": {"color_primary":"#6366f1","destination_vibe":"city"}
}

SUGGESTION CATEGORIES (choose at least 4):
- upgrade: High-value hospitality or travel improvements
- tip: Secret local spots or logistical hacks from context
- warning: Logistics or budget constraints to watch for
- weather: Specific advice based on the ACTUAL WEATHER FORECAST provided in the user prompt
- adventure/romantic: Targeted activities based on group_type

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

    # ── REAL DATA: Fetch trains + restaurants from pipeline cache ─────────────
    real_trains = []
    real_restaurants = []
    try:
        from app.database.session import SessionLocal
        db = SessionLocal()
        real_trains = retrieve_real_trains(db, source, destination)
        vibe_tags = preferences + ([group_type] if group_type else [])
        real_restaurants = retrieve_real_restaurants(db, destination, vibe_tags=vibe_tags, max_results=5)
        db.close()
    except Exception as _e:
        logger.warning("[Planner] Real data fetch failed (non-fatal): %s", _e)

    # Build enriched context — merges vector store + real trains + real restaurants
    context_str = build_enriched_context_string(rag_ctx, real_trains, real_restaurants, source, destination)

    # ── WEATHER: Get actual forecast for the dates ────────────────────────
    weather_data = await _weather_service.get_forecast(destination, start_date, end_date)
    weather_info = "\n".join([f"- {d}: {w['description']}" for d, w in weather_data.items()])

    date_list = [(start_date + timedelta(days=i)).isoformat() for i in range(num_days)]

    user_msg = f"""Generate an INTERACTIVE RAG-based trip plan.

TRIP INPUT:
- Source: {source} → Destination: {destination}
- Dates: {start_date} to {end_date} ({num_days} days, {nights} nights)
- Budget: ₹{budget:,.0f} total for {num_travelers} travelers (₹{budget/num_travelers:,.0f}/person)
- Group: {num_travelers} {group_type}
- Preferences: {', '.join(preferences) or 'general sightseeing, food, culture'}
- Day dates: {date_list}

ACTUAL WEATHER FORECAST:
{weather_info}

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
        plan = _patch_plan(plan, source, destination, budget, num_travelers, nights, rag_ctx, weather_data,
                           real_trains=real_trains, real_restaurants=real_restaurants)
        plan["_meta"] = {"planning_time_ms": round(elapsed, 1), "llm_used": True, "model": settings.GROQ_MODEL, "rag_retrieved": rag_ctx["retrieved_count"], "vector_store_size": rag_ctx["vector_data_count"]}
        logger.info("[Planner] ✓ LLM+RAG success %.0fms | retrieved=%d | real_trains=%d", elapsed, rag_ctx["retrieved_count"], len(real_trains))
        return plan

    logger.warning("[Planner] LLM failed — deterministic fallback")
    return _deterministic_fallback(source, destination, start_date, end_date, budget, num_travelers, group_type, nights, num_days, date_list, rag_ctx, weather_data, elapsed,
                                   real_trains=real_trains, real_restaurants=real_restaurants)


def _patch_plan(plan, source, destination, budget, num_travelers, nights, rag_ctx, weather_data,
                real_trains=None, real_restaurants=None):
    meta = plan.setdefault("meta", {})
    meta.setdefault("source", source); meta.setdefault("destination", destination)
    meta.setdefault("total_days", nights + 1); meta.setdefault("total_nights", nights)
    meta.setdefault("num_travelers", num_travelers); meta.setdefault("total_budget", budget)
    meta.setdefault("tags", []); meta.setdefault("summary_text", f"An unforgettable trip to {destination}!")

    # ── ALWAYS inject real trains as the first transport options (before LLM ones) ──
    real_train_cards = []
    if real_trains:
        real_train_cards = [_real_train_to_transport(t, i, num_travelers) for i, t in enumerate(real_trains[:3])]

    # Keep LLM-generated non-train options (flights, bus, self-drive)
    llm_options = [
        t for t in plan.get("transport_options", [])
        if (t.get("mode") or "").lower() not in ("train", "railway")
    ]

    # Merge: real trains first, then other LLM options (flights etc), cap at 6
    merged = real_train_cards + llm_options
    if not merged:
        # No real trains and LLM returned nothing — use RAG vector store
        by_type = rag_ctx["by_type"]
        merged = [_rag_to_transport(e, i, num_travelers) for i, e in enumerate(by_type.get("transport", [])[:5])]

    # Patch IDs and set recommended
    for i, t in enumerate(merged):
        t.setdefault("id", f"tx_{i:03d}")
        t.setdefault("highlights", [])
        # Mark first real train as recommended if budget train, else index 1
        if real_train_cards and i == 0:
            t["recommended"] = True
        else:
            t.setdefault("recommended", i == 1 and not real_train_cards)

    plan["transport_options"] = merged[:6]

    # Fill hotel from RAG if LLM returned empty
    by_type = rag_ctx["by_type"]
    if not plan.get("hotel_options"):
        plan["hotel_options"] = [_rag_to_hotel(e, i, nights) for i, e in enumerate(by_type.get("hotel", [])[:6])]
    if not plan.get("food_plans"):
        plan["food_plans"] = _default_food_plans(destination, num_travelers, nights + 1, real_restaurants)

    plan.setdefault("ai_suggestions", _default_suggestions(destination, budget, nights, weather_data))
    ui = plan.setdefault("ui", {}); ui.setdefault("color_primary", "#6366f1"); ui.setdefault("destination_vibe", "city")

    bb = plan.setdefault("budget_breakdown_estimate", {})
    tx = next((t["total_cost"] for t in plan.get("transport_options", []) if t.get("recommended")), budget * 0.15)
    ht = next((h["total_stay_cost"] for h in plan.get("hotel_options", []) if h.get("recommended")), budget * 0.35)
    fd = next((f["total_cost"] for f in plan.get("food_plans", []) if f.get("recommended")), 700 * num_travelers * (nights + 1))
    bb.setdefault("transport", int(tx)); bb.setdefault("stay", int(ht)); bb.setdefault("food", int(fd))
    bb.setdefault("activities", int(budget * 0.12)); bb.setdefault("misc", int(budget * 0.05))
    bb["total"] = sum(v for k, v in bb.items() if k != "total")

    # Inject weather per day
    for day in plan.get("itinerary", []):
        day_date = day.get("date")
        if day_date and day_date in weather_data:
            day["weather"] = weather_data[day_date]

    return plan


def _real_train_to_transport(train: dict, i: int, num_travelers: int) -> dict:
    """Convert a real pipeline train entry into a transport_option card."""
    name = train.get("train_name", "Train")
    number = train.get("train_number", "")
    dep = train.get("departure", "")
    arr = train.get("arrival", "")
    dur = train.get("duration_hrs", 0)
    days = train.get("days", ["Daily"])
    classes = train.get("class_types", ["SL", "3A"])

    # Best fare to display (prefer 3A as most popular)
    fare_3a = train.get("approx_fare_3a")
    fare_sl = train.get("approx_fare_sl")
    fare_2a = train.get("approx_fare_2a")
    display_fare = fare_3a or fare_sl or 800  # fallback estimate

    # Build highlights
    runs_str = ", ".join(days[:3]) if days else "Check schedule"
    fare_detail = []
    if fare_sl: fare_detail.append(f"SL: ₹{fare_sl}")
    if fare_3a: fare_detail.append(f"3A: ₹{fare_3a}")
    if fare_2a: fare_detail.append(f"2A: ₹{fare_2a}")
    highlights = [
        f"🚪 Departs {dep} → Arrives {arr}" if dep and arr else "Check IRCTC for schedule",
        f"📅 Runs: {runs_str}",
        f"🎫 Classes: {', '.join(classes)}",
    ] + (fare_detail if fare_detail else [])

    dur_str = f"{dur:.1f}h" if dur else "Check schedule"
    label = f"#{number} {name}" if number else name

    return {
        "id": f"real_train_{i}",
        "mode": "Train",
        "provider": label,
        "train_number": number,
        "train_name": name,
        "departure_time": dep,
        "arrival_time": arr,
        "duration_hrs": dur,
        "run_days": days,
        "class_types": classes,
        "fare_sl": fare_sl,
        "fare_3a": fare_3a,
        "fare_2a": fare_2a,
        "cost_per_person": int(display_fare),
        "total_cost": int(display_fare * num_travelers),
        "duration": dur_str,
        "comfort": 4 if fare_3a else 3,
        "highlights": highlights,
        "recommended": i == 0,
        "best_for": "Budget travelers" if fare_sl else "Comfortable travel",
        "source": "real_data",
    }


def _rag_to_transport(e, i, num_travelers):
    raw_name = (e.get("name") or e.get("category", "Flight")).lower()
    if any(k in raw_name for k in ["train", "railway", "irctc", "express"]):
        mode = "Train"
    elif any(k in raw_name for k in ["cab", "taxi", "car", "uber", "ola", "private"]):
        mode = "Car"
    elif any(k in raw_name for k in ["bus", "volvo", "coach", "roadways"]):
        mode = "Bus"
    else:
        mode = "Flight"
    
    return {"id": e["id"], "mode": mode, "provider": e["name"], "cost_per_person": int(e["price"]), "total_cost": int(e["price"] * num_travelers), "duration": e["duration"], "comfort": e.get("metadata", {}).get("comfort", 3), "highlights": e.get("tags", [])[:2], "recommended": i == 1, "best_for": e.get("metadata", {}).get("best_for", "")}

def _rag_to_hotel(e, i, nights):
    return {"id": e["id"], "name": e["name"], "tier": e.get("category", "mid_range"), "price_per_night": int(e["price"]), "total_stay_cost": int(e["price"] * nights), "rating": e.get("rating", 4.0), "location": e.get("metadata", {}).get("location", "City Center"), "amenities": e.get("metadata", {}).get("amenities", ["WiFi", "AC"]), "best_for": e.get("tags", ["all travelers"])[0], "recommended": i == 2}

def _default_food_plans(destination, num_travelers, days, real_restaurants=None):
    """Build food plans, enriching with real restaurant names if available."""
    # Extract restaurant names by price tier
    budget_rests = []
    mid_rests = []
    premium_rests = []
    if real_restaurants:
        for r in real_restaurants:
            pl = r.get("price_level", 2)
            name = r.get("name", "")
            if pl <= 1:
                budget_rests.append(name)
            elif pl <= 2:
                mid_rests.append(name)
            elif pl >= 3:
                premium_rests.append(name)

    budget_highlights = budget_rests[:2] if budget_rests else ["Street food", "Local chai", "Authentic flavours"]
    mid_highlights = mid_rests[:2] if mid_rests else ["Cafes", "Regional cuisine", "Rooftop dining"]
    premium_highlights = premium_rests[:2] if premium_rests else ["Fine dining", "Chef's specials", "Wine & cocktails"]

    return [
        {"id": "food_budget", "name": "Budget Local Eats",
         "description": f"Street food, local dhabas and authentic spots in {destination}",
         "cost_per_day": 350 * num_travelers, "total_cost": 350 * num_travelers * days,
         "highlights": budget_highlights + ["Street food", "Local chai"],
         "recommended": False},
        {"id": "food_balanced", "name": "Cafe & Restaurant Mix",
         "description": f"Cafes, mid-range restaurants and local specialties in {destination}",
         "cost_per_day": 700 * num_travelers, "total_cost": 700 * num_travelers * days,
         "highlights": mid_highlights + ["Regional cuisine"],
         "recommended": True},
        {"id": "food_premium", "name": "Fine Dining Experience",
         "description": f"Premium restaurants and curated dining experiences in {destination}",
         "cost_per_day": 1500 * num_travelers, "total_cost": 1500 * num_travelers * days,
         "highlights": premium_highlights + ["Chef's table"],
         "recommended": False},
    ]

def _default_suggestions(destination, budget, nights, weather_data=None):
    suggestions = [
        {"type": "tip", "icon": "💡", "title": f"The '{destination}' Secret", "description": f"Exploring {destination} by private cab is often 20% faster than public transport based on recent traveler data.", "potential_cost": 0},
        {"type": "upgrade", "icon": "💎", "title": "Priority Experience", "description": f"Upgrading to a guided heritage tour in {destination} ensures you don't miss the hidden historical spots.", "potential_cost": 1500},
        {"type": "warning", "icon": "⚠️", "title": "Budget Optimization", "description": "Local food spots are significantly cheaper and more authentic than hotel dining. Save up to ₹800 per day.", "potential_cost": 0},
        {"type": "adventure", "icon": "🏔️", "title": "Off-Beat Path", "description": "If you have 3 hours free on Day 2, check out the local viewpoints for a breathtaking sunset.", "potential_cost": 400},
    ]
    
    # Add weather tip if we have data
    if weather_data:
        first_day = next(iter(weather_data.values()), None)
        if first_day:
            suggestions.append({
                "type": "weather",
                "icon": "🌤️",
                "title": "Weather Insider",
                "description": f"Expect {first_day['condition']} with a high of {first_day['temp_max']}°C. Pack layers for maximum comfort!",
                "potential_cost": 0
            })
            
    return suggestions[:5]


def _deterministic_fallback(source, destination, start_date, end_date, budget, num_travelers,
                            group_type, nights, num_days, date_list, rag_ctx, weather_data, elapsed,
                            real_trains=None, real_restaurants=None):
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
        itinerary.append({
            "day": d+1,
            "date": date_list[d],
            "day_summary": f"Day {d+1} in {destination}",
            "weather": weather_data.get(date_list[d]),
            "morning": {"time": "08:00 AM", "activities": morn},
            "afternoon": {"time": "01:00 PM", "activities": aft},
            "evening": {"time": "06:00 PM", "activities": eve}
        })

    # Build transport: real trains first, then RAG vector options
    transport_options = []
    if real_trains:
        transport_options = [_real_train_to_transport(t, i, num_travelers) for i, t in enumerate(real_trains[:3])]
    rag_transport = [_rag_to_transport(e, i + len(transport_options), num_travelers)
                     for i, e in enumerate(by_type.get("transport", [])[:3])]
    # Only add RAG transport types not already covered by trains (flights, bus, car)
    for rt in rag_transport:
        if (rt.get("mode") or "").lower() not in ("train", "railway"):
            transport_options.append(rt)
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
        "food_plans": _default_food_plans(destination, num_travelers, num_days, real_restaurants),
        "itinerary": itinerary,
        "budget_breakdown_estimate": bb,
        "ai_suggestions": _default_suggestions(destination, budget, nights, weather_data),
        "ui": {"color_primary": "#6366f1", "destination_vibe": "city"},
        "_meta": {"planning_time_ms": round(elapsed, 1), "llm_used": False, "model": "deterministic-rag-fallback", "rag_retrieved": rag_ctx["retrieved_count"], "vector_store_size": rag_ctx["vector_data_count"]},
    }
