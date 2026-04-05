"""
TripSetGo Data Pipeline — fetch_train_data.py
==============================================
Fetches real Indian Railways train data via RapidAPI.
Uses multiple API endpoints with automatic fallback chain:
  1. indian-railway1.p.rapidapi.com  (500 free calls/month)
  2. irctc1.p.rapidapi.com           (official IRCTC, limited free)
  3. Curated mock data               (always works, zero quota)

Rate-limit handling: 1 second delay between API calls to stay within free tier.
"""
from __future__ import annotations
import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
RAPIDAPI_RAILWAYS_HOST = os.getenv("RAPIDAPI_RAILWAYS_HOST", "indian-railway-irctc.p.rapidapi.com")

# ── API endpoint priority chain ───────────────────────────────────────────────
# Each entry: (host, url, param_from, param_to, parser)
# We try them in order until one succeeds.

def _build_api_configs():
    """Build API configs dynamically using the env-var host."""
    return [
        # Primary: env-var host (indian-railway-irctc.p.rapidapi.com or custom)
        {
            "host": RAPIDAPI_RAILWAYS_HOST,
            "url": f"https://{RAPIDAPI_RAILWAYS_HOST}/v2/trainsBetweenStations/",
            "param_from": "fromStationCode",
            "param_to": "toStationCode",
            "parser": "irctc1",
        },
        # Fallback 1: irctc1 official
        {
            "host": "irctc1.p.rapidapi.com",
            "url": "https://irctc1.p.rapidapi.com/v2/trainsBetweenStations/",
            "param_from": "fromStationCode",
            "param_to": "toStationCode",
            "parser": "irctc1",
        },
        # Fallback 2: indian-railway1
        {
            "host": "indian-railway1.p.rapidapi.com",
            "url": "https://indian-railway1.p.rapidapi.com/train/betweenStation",
            "param_from": "fromStation",
            "param_to": "toStation",
            "parser": "indian_railway1",
        },
    ]

API_CONFIGS = _build_api_configs()

# ── Station codes ─────────────────────────────────────────────────────────────

STATION_CODES: Dict[str, str] = {
    "Mumbai": "CSTM",
    "Delhi": "NDLS",
    "Goa": "MAO",
    "Jaipur": "JP",
    "Rajasthan": "JP",
    "Kerala": "ERS",
    "Manali": "KULU",
    "Rishikesh": "RKSH",
    "Bangalore": "SBC",
    "Chennai": "MAS",
    "Pune": "PUNE",
    "Hyderabad": "HYB",
    "Leh Ladakh": "LEH",
    "Andaman Islands": "VPM",
}

# ── Major route pairs ─────────────────────────────────────────────────────────

ROUTE_PAIRS = [
    ("Mumbai", "Goa"),
    ("Mumbai", "Delhi"),
    ("Mumbai", "Jaipur"),
    ("Mumbai", "Kerala"),
    ("Delhi", "Manali"),
    ("Delhi", "Rajasthan"),
    ("Delhi", "Rishikesh"),
    ("Delhi", "Leh Ladakh"),
    ("Bangalore", "Goa"),
    ("Bangalore", "Kerala"),
    ("Chennai", "Kerala"),
    ("Pune", "Goa"),
    ("Hyderabad", "Goa"),
]

# ── Rich curated mock data (accurate real trains with real train numbers) ─────

MOCK_TRAINS: Dict[str, List[Dict]] = {
    "Mumbai-Goa": [
        {"train_number": "10103", "train_name": "Mandovi Express",
         "departure": "07:10", "arrival": "19:00", "duration_hrs": 11.8,
         "days": ["Mon", "Wed", "Fri", "Sun"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 395, "approx_fare_3a": 1055, "approx_fare_2a": 1515},
        {"train_number": "10111", "train_name": "Konkan Kanya Express",
         "departure": "23:00", "arrival": "11:00", "duration_hrs": 12.0,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A", "1A"],
         "approx_fare_sl": 380, "approx_fare_3a": 1010, "approx_fare_2a": 1455},
        {"train_number": "22113", "train_name": "LTT-MAO AC Express",
         "departure": "06:00", "arrival": "14:30", "duration_hrs": 8.5,
         "days": ["Tue", "Thu", "Sat"], "class_types": ["CC", "3A", "2A"],
         "approx_fare_sl": None, "approx_fare_3a": 890, "approx_fare_2a": 1280},
    ],
    "Mumbai-Delhi": [
        {"train_number": "12952", "train_name": "Mumbai Rajdhani Express",
         "departure": "17:00", "arrival": "08:35", "duration_hrs": 15.6,
         "days": ["Daily"], "class_types": ["3A", "2A", "1A"],
         "approx_fare_sl": None, "approx_fare_3a": 1855, "approx_fare_2a": 2620},
        {"train_number": "12904", "train_name": "Golden Temple Mail",
         "departure": "21:35", "arrival": "16:55", "duration_hrs": 19.3,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 510, "approx_fare_3a": 1385, "approx_fare_2a": 1995},
        {"train_number": "22210", "train_name": "Mumbai-Delhi Duronto",
         "departure": "23:00", "arrival": "15:25", "duration_hrs": 16.4,
         "days": ["Mon", "Wed", "Fri"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 560, "approx_fare_3a": 1510, "approx_fare_2a": 2160},
    ],
    "Mumbai-Jaipur": [
        {"train_number": "12956", "train_name": "Jaipur Superfast Express",
         "departure": "16:35", "arrival": "06:45", "duration_hrs": 14.2,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 425, "approx_fare_3a": 1145, "approx_fare_2a": 1645},
        {"train_number": "19708", "train_name": "Aravali Express",
         "departure": "13:55", "arrival": "06:05", "duration_hrs": 16.2,
         "days": ["Tue", "Thu", "Sat", "Sun"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 390, "approx_fare_3a": 1055, "approx_fare_2a": 1515},
    ],
    "Delhi-Jaipur": [
        {"train_number": "12015", "train_name": "Ajmer Shatabdi Express",
         "departure": "06:05", "arrival": "10:40", "duration_hrs": 4.6,
         "days": ["Daily"], "class_types": ["EC", "CC"],
         "approx_fare_sl": None, "approx_fare_3a": 765, "approx_fare_2a": 1425},
        {"train_number": "12413", "train_name": "Ajmer Shatabdi (2nd)",
         "departure": "06:20", "arrival": "10:20", "duration_hrs": 4.0,
         "days": ["Daily"], "class_types": ["EC", "CC"],
         "approx_fare_sl": None, "approx_fare_3a": 710, "approx_fare_2a": None},
        {"train_number": "12958", "train_name": "Swarna Jayanti Rajdhani",
         "departure": "22:55", "arrival": "04:30", "duration_hrs": 5.6,
         "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
         "class_types": ["3A", "2A", "1A"],
         "approx_fare_sl": None, "approx_fare_3a": 1050, "approx_fare_2a": 1510},
    ],
    "Delhi-Rishikesh": [
        {"train_number": "12017", "train_name": "Dehradun Shatabdi",
         "departure": "06:45", "arrival": "11:55", "duration_hrs": 5.2,
         "days": ["Daily"], "class_types": ["EC", "CC"],
         "approx_fare_sl": None, "approx_fare_3a": 680, "approx_fare_2a": None},
        {"train_number": "12205", "train_name": "Nanda Devi Express",
         "departure": "23:10", "arrival": "06:05", "duration_hrs": 6.9,
         "days": ["Tue", "Wed", "Fri", "Sun"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 255, "approx_fare_3a": 685, "approx_fare_2a": 975},
    ],
    "Delhi-Manali": [
        {"train_number": "12479", "train_name": "Suryanagri Express (to Chandigarh)",
         "departure": "20:35", "arrival": "00:20", "duration_hrs": 3.8,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 180, "approx_fare_3a": 480, "approx_fare_2a": 690},
        {"train_number": "12011", "train_name": "Kalka Shatabdi (to Chandigarh)",
         "departure": "07:40", "arrival": "11:05", "duration_hrs": 3.4,
         "days": ["Daily"], "class_types": ["EC", "CC"],
         "approx_fare_sl": None, "approx_fare_3a": 595, "approx_fare_2a": None},
    ],
    "Bangalore-Goa": [
        {"train_number": "16523", "train_name": "Karwar Express",
         "departure": "20:45", "arrival": "06:40", "duration_hrs": 9.9,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 325, "approx_fare_3a": 870, "approx_fare_2a": 1250},
        {"train_number": "17309", "train_name": "Yesvantpur Vasco Express",
         "departure": "23:15", "arrival": "10:45", "duration_hrs": 11.5,
         "days": ["Mon", "Wed", "Fri"], "class_types": ["SL", "3A"],
         "approx_fare_sl": 285, "approx_fare_3a": 760, "approx_fare_2a": None},
    ],
    "Bangalore-Kerala": [
        {"train_number": "16527", "train_name": "Kannur Express",
         "departure": "21:15", "arrival": "05:00", "duration_hrs": 7.8,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 270, "approx_fare_3a": 720, "approx_fare_2a": 1035},
        {"train_number": "22650", "train_name": "Ypr Trivandrum SF Express",
         "departure": "14:30", "arrival": "03:00", "duration_hrs": 12.5,
         "days": ["Mon", "Wed", "Sat"], "class_types": ["SL", "3A", "2A", "1A"],
         "approx_fare_sl": 390, "approx_fare_3a": 1045, "approx_fare_2a": 1500},
    ],
    "Pune-Goa": [
        {"train_number": "10103", "train_name": "Mandovi Express (via Pune)",
         "departure": "10:20", "arrival": "19:00", "duration_hrs": 8.7,
         "days": ["Mon", "Wed", "Fri", "Sun"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 305, "approx_fare_3a": 815, "approx_fare_2a": 1170},
        {"train_number": "12779", "train_name": "Goa Express",
         "departure": "15:10", "arrival": "04:55", "duration_hrs": 13.8,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 330, "approx_fare_3a": 885, "approx_fare_2a": 1270},
    ],
    "Chennai-Kerala": [
        {"train_number": "12602", "train_name": "Chennai Mail",
         "departure": "19:00", "arrival": "03:30", "duration_hrs": 8.5,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A", "1A"],
         "approx_fare_sl": 290, "approx_fare_3a": 775, "approx_fare_2a": 1115},
        {"train_number": "12678", "train_name": "Ernakulam SF Express",
         "departure": "22:15", "arrival": "07:00", "duration_hrs": 8.8,
         "days": ["Tue", "Thu", "Sat"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 310, "approx_fare_3a": 830, "approx_fare_2a": 1195},
    ],
    "Hyderabad-Goa": [
        {"train_number": "17001", "train_name": "Hyderabad Vasco Express",
         "departure": "14:45", "arrival": "10:05", "duration_hrs": 19.3,
         "days": ["Mon", "Thu"], "class_types": ["SL", "3A"],
         "approx_fare_sl": 430, "approx_fare_3a": 1155, "approx_fare_2a": None},
        {"train_number": "17417", "train_name": "Tirupati Rajkot Express (partial)",
         "departure": "10:50", "arrival": "04:45", "duration_hrs": 18.0,
         "days": ["Mon", "Wed"], "class_types": ["SL", "3A"],
         "approx_fare_sl": 395, "approx_fare_3a": 1055, "approx_fare_2a": None},
    ],
    "Mumbai-Kerala": [
        {"train_number": "16345", "train_name": "Netravati Express",
         "departure": "11:40", "arrival": "18:05", "duration_hrs": 30.4,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A"],
         "approx_fare_sl": 590, "approx_fare_3a": 1590, "approx_fare_2a": 2290},
        {"train_number": "12617", "train_name": "Mangala Lakshadweep SF",
         "departure": "08:00", "arrival": "12:25", "duration_hrs": 28.4,
         "days": ["Daily"], "class_types": ["SL", "3A", "2A", "1A"],
         "approx_fare_sl": 555, "approx_fare_3a": 1495, "approx_fare_2a": 2150},
    ],
}


# ── Core fetch function ───────────────────────────────────────────────────────

async def fetch_trains_for_route(source: str, destination: str) -> List[Dict]:
    """
    Fetch train data using a priority chain of RapidAPI endpoints.
    Falls back to curated mock data if all APIs fail or no key is set.
    """
    route_key = f"{source}-{destination}"
    reverse_key = f"{destination}-{source}"

    # Always use mock if no key provided
    if not RAPIDAPI_KEY:
        logger.info("[TrainFetch] No API key — using mock for %s", route_key)
        return MOCK_TRAINS.get(route_key) or MOCK_TRAINS.get(reverse_key) or []

    src_code = STATION_CODES.get(source)
    dst_code = STATION_CODES.get(destination)

    if not src_code or not dst_code:
        logger.info("[TrainFetch] No station code for %s→%s — using mock", source, destination)
        return MOCK_TRAINS.get(route_key) or MOCK_TRAINS.get(reverse_key) or []

    # Try each API config in order
    for config in API_CONFIGS:
        trains = await _try_api(config, src_code, dst_code, source, destination)
        if trains:
            logger.info("[TrainFetch] ✓ %s→%s via %s: %d trains",
                        source, destination, config["host"], len(trains))
            return trains
        # Small delay between attempts to avoid hammering rate limits
        await asyncio.sleep(1)

    # All APIs failed — use curated mock
    logger.info("[TrainFetch] All APIs exhausted for %s→%s — using mock", source, destination)
    return MOCK_TRAINS.get(route_key) or MOCK_TRAINS.get(reverse_key) or []


async def _try_api(config: Dict, src_code: str, dst_code: str,
                   source: str, destination: str) -> List[Dict]:
    """Try a single API config. Returns list on success, [] on failure."""
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": config["host"],
    }
    params = {
        config["param_from"]: src_code,
        config["param_to"]: dst_code,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(config["url"], params=params, headers=headers)

        if r.status_code == 429:
            logger.warning("[TrainFetch] 429 Rate limit on %s", config["host"])
            return []
        if r.status_code == 401 or r.status_code == 403:
            logger.warning("[TrainFetch] Auth error %d on %s — not subscribed?",
                           r.status_code, config["host"])
            return []

        r.raise_for_status()
        data = r.json()

        return _parse_response(data, config["parser"])

    except httpx.TimeoutException:
        logger.warning("[TrainFetch] Timeout on %s", config["host"])
        return []
    except Exception as e:
        logger.warning("[TrainFetch] Error on %s: %s", config["host"], e)
        return []


def _parse_response(data: Dict, parser: str) -> List[Dict]:
    """Parse different API response formats into a unified schema."""
    trains = []

    if parser == "irctc1":
        # irctc1.p.rapidapi.com response format
        items = data.get("data") or []
        for t in items[:5]:
            trains.append({
                "train_number": t.get("train_num", ""),
                "train_name": t.get("train_name", ""),
                "departure": t.get("from_sta", ""),
                "arrival": t.get("to_sta", ""),
                "duration_hrs": _parse_duration(t.get("duration", "")),
                "days": t.get("run_days", ["Daily"]),
                "class_types": _parse_class_types(t.get("train_type", "")),
                "approx_fare_sl": None,
                "approx_fare_3a": None,
                "approx_fare_2a": None,
            })

    elif parser == "indian_railway1":
        # indian-railway1.p.rapidapi.com response format
        items = data.get("data") or data.get("trains") or []
        for t in items[:5]:
            trains.append({
                "train_number": str(t.get("trainNumber", t.get("train_number", ""))),
                "train_name": t.get("trainName", t.get("train_name", "")),
                "departure": t.get("departureTime", t.get("from_time", "")),
                "arrival": t.get("arrivalTime", t.get("to_time", "")),
                "duration_hrs": _parse_duration(
                    t.get("duration", t.get("travelTime", ""))
                ),
                "days": t.get("runningDays", t.get("days", ["Daily"])),
                "class_types": _parse_class_types(
                    t.get("classType", t.get("classes", "SL/3A"))
                ),
                "approx_fare_sl": t.get("fare", {}).get("SL") if isinstance(t.get("fare"), dict) else None,
                "approx_fare_3a": t.get("fare", {}).get("3A") if isinstance(t.get("fare"), dict) else None,
                "approx_fare_2a": t.get("fare", {}).get("2A") if isinstance(t.get("fare"), dict) else None,
            })

    # Filter out empty entries
    return [t for t in trains if t["train_name"] or t["train_number"]]


def _parse_class_types(raw: str) -> List[str]:
    if not raw:
        return ["SL", "3A", "2A"]
    if isinstance(raw, list):
        return raw
    # Split by common delimiters
    parts = [p.strip() for p in raw.replace(",", "/").split("/") if p.strip()]
    return parts or ["SL", "3A", "2A"]


def _parse_duration(dur_str: str) -> float:
    """Parse '9:30' or '09h 30m' or '570' (minutes) into decimal hours."""
    if not dur_str:
        return 0.0
    try:
        s = str(dur_str).strip()
        if ":" in s:
            parts = s.split(":")
            return int(parts[0]) + int(parts[1]) / 60
        if "h" in s.lower():
            h = float(s.split("h")[0].strip())
            m_part = s.lower().split("h")[1].replace("m", "").strip()
            m = float(m_part) if m_part else 0
            return h + m / 60
        # Maybe it's just minutes
        mins = float(s)
        if mins > 24:  # Treat as minutes
            return round(mins / 60, 2)
        return mins  # Treat as hours
    except Exception:
        pass
    return 0.0


# ── Bulk fetch ────────────────────────────────────────────────────────────────

async def run_all_routes(db_session=None) -> Dict[str, List[Dict]]:
    """
    Fetch all route pairs with a delay between calls to stay within rate limits.
    """
    results = {}
    for i, (source, dest) in enumerate(ROUTE_PAIRS):
        key = f"{source}-{dest}"
        trains = await fetch_trains_for_route(source, dest)
        results[key] = trains

        if db_session and trains:
            _upsert_transport_cache(db_session, source, dest, trains)

        # Throttle: wait 1.2s between API calls to avoid rate limits
        if RAPIDAPI_KEY and i < len(ROUTE_PAIRS) - 1:
            await asyncio.sleep(1.2)

    logger.info("[TrainFetch] Completed fetching %d routes", len(results))
    return results


# ── DB helpers ────────────────────────────────────────────────────────────────

def _upsert_transport_cache(db, source: str, destination: str, trains: List[Dict]):
    """Upsert into transport_cache table."""
    try:
        from sqlalchemy import text
        db.execute(text("""
            INSERT INTO transport_cache (source, destination, data, fetched_at)
            VALUES (:src, :dst, :data, :ts)
            ON CONFLICT (source, destination)
            DO UPDATE SET data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at
        """), {
            "src": source,
            "dst": destination,
            "data": json.dumps(trains),
            "ts": datetime.now(timezone.utc),
        })
        db.commit()
        logger.info("[TrainFetch] Cached %d trains for %s→%s", len(trains), source, destination)
    except Exception as e:
        logger.error("[TrainFetch] DB upsert failed: %s", e)


def get_cached_trains(db, source: str, destination: str) -> List[Dict]:
    """Retrieve cached trains from DB. Falls back to mock if cache miss."""
    try:
        from sqlalchemy import text
        for src, dst in [(source, destination), (destination, source)]:
            row = db.execute(text(
                "SELECT data FROM transport_cache WHERE source=:src AND destination=:dst"
            ), {"src": src, "dst": dst}).fetchone()
            if row:
                raw = row[0]
                return json.loads(raw) if isinstance(raw, str) else raw
    except Exception as e:
        logger.warning("[TrainFetch] Cache lookup failed: %s", e)

    # Cache miss — return mock
    route_key = f"{source}-{destination}"
    reverse_key = f"{destination}-{source}"
    return MOCK_TRAINS.get(route_key) or MOCK_TRAINS.get(reverse_key) or []
