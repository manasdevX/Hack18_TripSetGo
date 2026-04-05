"""
TripSetGo Data Pipeline — fetch_restaurant_data.py
====================================================
Fetches real restaurant/food place data via:
  1. Google Places API (primary — if GOOGLE_PLACES_API_KEY set)
  2. Foursquare Places API (fallback — if FOURSQUARE_API_KEY set)
  3. Curated mock data (always works, no key needed)

Each restaurant is converted into a rich text block for embedding.
"""
from __future__ import annotations
import logging
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import json

import httpx

logger = logging.getLogger(__name__)

GOOGLE_PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
FOURSQUARE_KEY = os.getenv("FOURSQUARE_API_KEY", "")

# Destinations to pre-fetch for
DESTINATION_COORDS: Dict[str, Dict[str, float]] = {
    "Goa": {"lat": 15.2993, "lng": 74.1240},
    "Kerala": {"lat": 9.9312, "lng": 76.2673},
    "Rajasthan": {"lat": 26.9124, "lng": 75.7873},
    "Jaipur": {"lat": 26.9124, "lng": 75.7873},
    "Manali": {"lat": 32.2432, "lng": 77.1892},
    "Rishikesh": {"lat": 30.0869, "lng": 78.2676},
    "Mumbai": {"lat": 19.0760, "lng": 72.8777},
    "Delhi": {"lat": 28.7041, "lng": 77.1025},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Bali": {"lat": -8.3405, "lng": 115.0920},
    "Dubai": {"lat": 25.2048, "lng": 55.2708},
    "Singapore": {"lat": 1.3521, "lng": 103.8198},
}

# ── Rich mock restaurant dataset ──────────────────────────────────────────────

MOCK_RESTAURANTS: Dict[str, List[Dict]] = {
    "Goa": [
        {"name": "Thalassa", "category": "Mediterranean / Greek", "rating": 4.6,
         "price_level": 3, "address": "Small Vagator, North Goa",
         "vibe_tags": ["romantic", "sea view", "upscale", "couple"],
         "reviews": ["Stunning sea-view terrace with candlelit tables — absolute paradise for couples.",
                     "The mezze platter and Greek wines are unbelievable — best restaurant in Goa.",
                     "Perfect sunset dinner spot. Book in advance, gets crowded fast."]},
        {"name": "Fisherman's Wharf", "category": "Seafood", "rating": 4.4,
         "price_level": 2, "address": "Cavelossim, South Goa",
         "vibe_tags": ["seafood", "riverside", "family", "local"],
         "reviews": ["Best prawn curry I've ever had — fresh catch every day.",
                     "Riverside seating, great ambiance. The grilled kingfish is a must.",
                     "Family-friendly and affordable. Excellent local Goan food."]},
        {"name": "Britto's", "category": "Multi-Cuisine Beach Shack", "rating": 4.2,
         "price_level": 2, "address": "Baga Beach, North Goa",
         "vibe_tags": ["beach", "party", "friends", "casual"],
         "reviews": ["Classic Goa beach shack experience — great vibe, live music nightly.",
                     "sangrias and seafood platter are legendary. Great for large groups.",
                     "Touristy but still fun. Affordable drinks and good food."]},
        {"name": "Gunpowder", "category": "South Indian / Goan", "rating": 4.5,
         "price_level": 2, "address": "Assagao, North Goa",
         "vibe_tags": ["authentic", "hidden gem", "couple", "solo"],
         "reviews": ["Hidden gem! Authentic South Indian food in a beautiful garden setting.",
                     "The Kerala fish curry here is better than in Kerala itself.",
                     "Peaceful lunch spot away from touristy beaches. Very recommended."]},
        {"name": "Pousada by the Beach", "category": "Fine Dining / Goan", "rating": 4.7,
         "price_level": 4, "address": "Calangute, North Goa",
         "vibe_tags": ["luxury", "romantic", "honeymoon", "couple"],
         "reviews": ["Five star dining experience on the beach. Impeccable service.",
                     "Splurge on the tasting menu — worth every rupee for a special occasion.",
                     "Most romantic restaurant in Goa. The lobster thermidor is divine."]},
    ],
    "Kerala": [
        {"name": "Dal Roti", "category": "North Indian", "rating": 4.3,
         "price_level": 1, "address": "Fort Kochi",
         "vibe_tags": ["budget", "backpacker", "solo", "homely"],
         "reviews": ["Super affordable and filling. Great for backpackers.",
                     "Best value thali in Kochi. Clean and friendly staff.",
                     "Nothing fancy but consistently good. Dal tadka is excellent."]},
        {"name": "Oceanos", "category": "Seafood / Kerala", "rating": 4.6,
         "price_level": 3, "address": "Fort Kochi Beach",
         "vibe_tags": ["seafood", "waterfront", "couple", "family"],
         "reviews": ["Freshest seafood in Fort Kochi — the karimeen pollichathu is incredible.",
                     "Waterfront views with authentic Kerala fish curry. Highly recommend.",
                     "Great rooftop seating. Book sunset slot for the best experience."]},
        {"name": "Paragon Restaurant", "category": "Kerala Cuisine", "rating": 4.5,
         "price_level": 2, "address": "Kozhikode",
         "vibe_tags": ["authentic", "family", "biryani", "local"],
         "reviews": ["The Malabar biryani here is legendary — been running for 70 years!",
                     "Best prawn biryani in Kerala. Always crowded — arrive early.",
                     "Authentic Malabar flavors. The beef fry and pathiri are outstanding."]},
    ],
    "Rajasthan": [
        {"name": "Suvarna Mahal", "category": "Royal Rajasthani / Fine Dining", "rating": 4.8,
         "price_level": 5, "address": "Rambagh Palace, Jaipur",
         "vibe_tags": ["royal", "luxury", "heritage", "romantic", "couple"],
         "reviews": ["Dining under chandeliers in a maharaja's palace — surreal experience.",
                     "The Laal Maas and Dal Baati Churma are perfectly executed.",
                     "Expensive but worth it for a once-in-a-lifetime royal meal."]},
        {"name": "Lassiwala", "category": "Street Food / Lassi", "rating": 4.7,
         "price_level": 1, "address": "MI Road, Jaipur",
         "vibe_tags": ["iconic", "street food", "solo", "budget", "local"],
         "reviews": ["The most famous lassi in India. Thick, creamy and served in clay cups.",
                     "Queue every morning — absolutely worth it. Only open till they run out.",
                     "A Jaipur institution. The original branch on MI Road only."]},
        {"name": "Niros", "category": "Indian / Continental", "rating": 4.4,
         "price_level": 2, "address": "MI Road, Jaipur",
         "vibe_tags": ["family", "AC", "tradition", "all"],
         "reviews": ["Running since 1949 — a Jaipur classic. Great for families.",
                     "Best air-conditioned restaurant in the city. Mutton Kofta is a must.",
                     "Reasonably priced with consistent quality. Never disappoints."]},
    ],
    "Manali": [
        {"name": "Cafe 1947", "category": "Multicuisine / Cafe", "rating": 4.5,
         "price_level": 2, "address": "Old Manali",
         "vibe_tags": ["cozy", "mountain view", "friends", "solo"],
         "reviews": ["Amazing mountain views from the rooftop seating. Perfect after a trek.",
                     "Try the apple pie and Israeli breakfast — both are exceptional.",
                     "The vibe is unbeatable — bonfire in evenings, great music selection."]},
        {"name": "Drifter's Inn", "category": "Cafe / Backpacker", "rating": 4.3,
         "price_level": 1, "address": "Old Manali",
         "vibe_tags": ["budget", "backpacker", "solo", "friends"],
         "reviews": ["Cheapest and best momos in Manali. Very popular with solo travelers.",
                     "Israeli food done right — hummus and shakshuka are excellent.",
                     "Great place to meet other travelers. Really zen atmosphere."]},
        {"name": "Il Forno", "category": "Italian / European", "rating": 4.4,
         "price_level": 2, "address": "Old Manali Village",
         "vibe_tags": ["couple", "romantic", "cozy", "evening"],
         "reviews": ["Charming wood-fired Italian in the mountains — magical combination.",
                     "Best pizza I've had in India. The pasta carbonara is authentic.",
                     "Romantic dinner spot with candles and mountain views."]},
    ],
    "Bali": [
        {"name": "Locavore", "category": "Contemporary / Fine Dining", "rating": 4.8,
         "price_level": 5, "address": "Ubud, Bali",
         "vibe_tags": ["fine dining", "romantic", "couple", "luxury", "foodies"],
         "reviews": ["Best restaurant in Bali — possibly all of Southeast Asia. Stunning tasting menu.",
                     "Farm-to-table concept executed perfectly. Every course is art.",
                     "Book 2 months ahead. Worth every penny for serious food lovers."]},
        {"name": "Warung Babi Guling Ibu Oka", "category": "Balinese / Street Food", "rating": 4.6,
         "price_level": 1, "address": "Ubud, Bali",
         "vibe_tags": ["authentic", "local", "budget", "solo", "iconic"],
         "reviews": ["Best Babi Guling (suckling pig) in Bali — as featured on Anthony Bourdain.",
                     "Tiny warung but legendary food. Queue early, sells out by noon.",
                     "The crispy skin and sambal are absolutely perfect."]},
        {"name": "Seasalt", "category": "Seafood / Beachfront", "rating": 4.5,
         "price_level": 3, "address": "Jimbaran, Bali",
         "vibe_tags": ["beach", "seafood", "sunset", "romantic", "couple"],
         "reviews": ["Feet in the sand, sunset dining, grilled seafood — Bali perfection.",
                     "The lobster grilled on the beach is an experience you won't forget.",
                     "Perfect for couples. The sunset timing makes it magical."]},
    ],
    "Dubai": [
        {"name": "At.mosphere", "category": "Fine Dining / Burj Khalifa", "rating": 4.9,
         "price_level": 5, "address": "Level 122, Burj Khalifa",
         "vibe_tags": ["luxury", "iconic", "couple", "romantic", "honeymoon"],
         "reviews": ["Dining above the clouds — the most spectacular restaurant view in the world.",
                     "The steak is perfect, the wine list exceptional. A once-in-a-lifetime meal.",
                     "Pricey but the experience is absolutely worth it. Book months ahead."]},
        {"name": "Al Ustad Special Kabab", "category": "Persian / Middle Eastern", "rating": 4.6,
         "price_level": 1, "address": "Deira, Old Dubai",
         "vibe_tags": ["local", "authentic", "budget", "kebab", "solo"],
         "reviews": ["Best authentic kababs in Dubai — locals' secret spot in Deira.",
                     "The mutton seekh kabab here has been perfected over 50 years.",
                     "No frills, just extraordinary food. Cash only, get there early."]},
        {"name": "Pierchic", "category": "Seafood / Fine Dining", "rating": 4.7,
         "price_level": 4, "address": "Al Qasr Hotel, Jumeirah Beach",
         "vibe_tags": ["romantic", "couple", "seafood", "waterfront", "luxury"],
         "reviews": ["Built on a pier over the Arabian Sea — the most romantic restaurant in Dubai.",
                     "Lobster bisque and grilled sea bass are exceptional.",
                     "Perfect for proposals and anniversaries. Impeccable service."]},
    ],
    "Singapore": [
        {"name": "Hawker Chan", "category": "Hawker / Michelin Starred", "rating": 4.5,
         "price_level": 1, "address": "Chinatown Complex, Singapore",
         "vibe_tags": ["budget", "michelin", "iconic", "solo", "local"],
         "reviews": ["World's cheapest Michelin starred meal — $3 chicken rice!",
                     "Queue is long but the soy chicken is absolutely worth every minute.",
                     "A must-do in Singapore. The char siu is perfectly lacquered."]},
        {"name": "Burnt Ends", "category": "Modern BBQ / Australian", "rating": 4.8,
         "price_level": 4, "address": "Teck Lim Road, Singapore",
         "vibe_tags": ["foodies", "BBQ", "couple", "romantic", "friends"],
         "reviews": ["The wagyu and burnt ends are extraordinary. Best BBQ in Asia.",
                     "Reserve weeks in advance — tiny restaurant with a cult following.",
                     "The open grill counter is theater. Every bite is memorable."]},
        {"name": "Lau Pa Sat (Festival Market)", "category": "Hawker Centre", "rating": 4.4,
         "price_level": 1, "address": "Raffles Quay, CBD",
         "vibe_tags": ["local", "budget", "all", "iconic", "satay"],
         "reviews": ["Most iconic hawker market in Singapore. Satay Street at night is unmissable.",
                     "Try everything — laksa, noodles, satay. All freshly made.",
                     "Perfect for first-timers. A true melting pot of Singapore cuisine."]},
    ],
}


def _build_embedding_text(restaurant: Dict, destination: str) -> str:
    """Build a rich text block for vector embedding."""
    reviews_text = " ".join(restaurant.get("reviews", []))
    vibes = ", ".join(restaurant.get("vibe_tags", []))
    return (
        f"{restaurant['name']}, {destination} — Rating: {restaurant['rating']} — "
        f"Category: {restaurant['category']} — "
        f"Price Level: {'$' * restaurant.get('price_level', 2)} — "
        f"Vibes: {vibes}. "
        f"Location: {restaurant.get('address', destination)}. "
        f"Reviews: {reviews_text}"
    )


async def fetch_restaurants_for_destination(destination: str) -> List[Dict]:
    """
    Fetch restaurant data. Uses Google Places → Foursquare → Mock fallback.
    Returns normalized restaurant dicts with embedding text.
    """
    coords = DESTINATION_COORDS.get(destination)

    # Try Google Places API
    if GOOGLE_PLACES_KEY and coords:
        restaurants = await _fetch_google_places(destination, coords)
        if restaurants:
            return restaurants

    # Try Foursquare API
    if FOURSQUARE_KEY and coords:
        restaurants = await _fetch_foursquare(destination, coords)
        if restaurants:
            return restaurants

    # Fall back to mock
    logger.info("[RestaurantFetch] Using mock data for %s", destination)
    mock = MOCK_RESTAURANTS.get(destination, [])
    return [
        {
            **r,
            "destination": destination,
            "text_for_embedding": _build_embedding_text(r, destination),
            "source": "mock",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        for r in mock
    ]


async def _fetch_google_places(destination: str, coords: Dict) -> List[Dict]:
    """Fetch from Google Places API nearbysearch endpoint."""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{coords['lat']},{coords['lng']}",
        "radius": 10000,
        "type": "restaurant",
        "key": GOOGLE_PLACES_KEY,
        "rankby": "prominence",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()

        results = []
        for place in (data.get("results") or [])[:10]:
            name = place.get("name", "")
            rating = place.get("rating", 0)
            price_level = place.get("price_level", 2)
            address = place.get("vicinity", destination)
            types = place.get("types", [])
            vibe_tags = _infer_vibe_tags_from_types(types, rating, price_level)

            results.append({
                "name": name,
                "category": _google_types_to_category(types),
                "rating": rating,
                "price_level": price_level,
                "address": address,
                "vibe_tags": vibe_tags,
                "reviews": [],  # Would need Details API call for reviews (extra quota)
                "destination": destination,
                "text_for_embedding": _build_embedding_text(
                    {"name": name, "category": _google_types_to_category(types),
                     "rating": rating, "price_level": price_level,
                     "address": address, "vibe_tags": vibe_tags, "reviews": []},
                    destination
                ),
                "source": "google_places",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })

        logger.info("[RestaurantFetch] Google Places: got %d results for %s", len(results), destination)
        return results

    except Exception as e:
        logger.warning("[RestaurantFetch] Google Places failed for %s: %s", destination, e)
        return []


async def _fetch_foursquare(destination: str, coords: Dict) -> List[Dict]:
    """Fetch from Foursquare Places API."""
    url = "https://api.foursquare.com/v3/places/search"
    params = {
        "ll": f"{coords['lat']},{coords['lng']}",
        "categories": "13065",  # Foursquare category ID for restaurants
        "radius": 10000,
        "limit": 10,
        "sort": "POPULARITY",
    }
    headers = {
        "Authorization": FOURSQUARE_KEY,
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params, headers=headers)
            r.raise_for_status()
            data = r.json()

        results = []
        for place in (data.get("results") or [])[:10]:
            name = place.get("name", "")
            cats = place.get("categories", [])
            category = cats[0].get("name", "Restaurant") if cats else "Restaurant"
            rating = round(place.get("rating", 8.0) / 2, 1)  # Foursquare is /10
            price = place.get("price", 2)
            address = ", ".join(
                filter(None, [
                    place.get("location", {}).get("address"),
                    place.get("location", {}).get("locality"),
                ])
            ) or destination
            vibe_tags = _infer_vibe_tags_from_types(
                [c.get("name", "").lower() for c in cats], rating, price
            )

            results.append({
                "name": name,
                "category": category,
                "rating": rating,
                "price_level": price,
                "address": address,
                "vibe_tags": vibe_tags,
                "reviews": [],
                "destination": destination,
                "text_for_embedding": _build_embedding_text(
                    {"name": name, "category": category, "rating": rating,
                     "price_level": price, "address": address,
                     "vibe_tags": vibe_tags, "reviews": []},
                    destination
                ),
                "source": "foursquare",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })

        logger.info("[RestaurantFetch] Foursquare: got %d results for %s", len(results), destination)
        return results

    except Exception as e:
        logger.warning("[RestaurantFetch] Foursquare failed for %s: %s", destination, e)
        return []


def _google_types_to_category(types: List[str]) -> str:
    type_map = {
        "seafood_restaurant": "Seafood",
        "indian_restaurant": "Indian",
        "chinese_restaurant": "Chinese",
        "italian_restaurant": "Italian",
        "thai_restaurant": "Thai",
        "cafe": "Cafe",
        "bar": "Bar & Grill",
        "bakery": "Bakery & Cafe",
        "meal_takeaway": "Street Food",
    }
    for t in types:
        if t in type_map:
            return type_map[t]
    return "Restaurant"


def _infer_vibe_tags_from_types(types: List[str], rating: float, price_level: int) -> List[str]:
    tags = []
    type_str = " ".join(types).lower()
    if "bar" in type_str or "nightlife" in type_str:
        tags.extend(["nightlife", "friends"])
    if "seafood" in type_str or "fish" in type_str:
        tags.extend(["seafood"])
    if "cafe" in type_str or "bakery" in type_str:
        tags.extend(["cozy", "solo"])
    if price_level and price_level >= 4:
        tags.extend(["luxury", "romantic", "couple"])
    elif price_level and price_level <= 1:
        tags.extend(["budget", "local"])
    if rating >= 4.5:
        tags.extend(["highly_rated"])
    tags.extend(["family", "all"])
    return list(set(tags))[:6]


def get_cached_restaurants(db, destination: str) -> List[Dict]:
    """Fetch cached restaurants from DB."""
    try:
        from sqlalchemy import text
        rows = db.execute(
            text("SELECT name, category, vibe_tags, price_level, rating, address, text_for_embedding, source "
                 "FROM restaurant_cache WHERE destination=:dest ORDER BY rating DESC LIMIT 20"),
            {"dest": destination}
        ).fetchall()
        return [
            {"name": r[0], "category": r[1], "vibe_tags": r[2] or [],
             "price_level": r[3], "rating": r[4], "address": r[5],
             "text_for_embedding": r[6], "source": r[7]}
            for r in rows
        ]
    except Exception as e:
        logger.warning("[RestaurantFetch] Cache lookup failed: %s", e)
    return []


def upsert_restaurants_to_db(db, restaurants: List[Dict]):
    """Store fetched restaurants in the restaurant_cache table."""
    try:
        from sqlalchemy import text
        for r in restaurants:
            db.execute(text("""
                INSERT INTO restaurant_cache
                  (destination, name, category, vibe_tags, price_level, rating, address, text_for_embedding, source, fetched_at)
                VALUES (:dest, :name, :cat, :vibe, :price, :rating, :addr, :text, :source, :ts)
                ON CONFLICT DO NOTHING
            """), {
                "dest": r.get("destination", ""),
                "name": r.get("name", ""),
                "cat": r.get("category", ""),
                "vibe": json.dumps(r.get("vibe_tags", [])),
                "price": r.get("price_level", 2),
                "rating": r.get("rating", 0),
                "addr": r.get("address", ""),
                "text": r.get("text_for_embedding", ""),
                "source": r.get("source", "mock"),
                "ts": datetime.now(timezone.utc),
            })
        db.commit()
        logger.info("[RestaurantFetch] Stored %d restaurants in DB", len(restaurants))
    except Exception as e:
        logger.error("[RestaurantFetch] DB insert failed: %s", e)
