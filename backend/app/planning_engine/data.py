"""
Comprehensive Knowledge Base for Indian & International Destinations.
Deterministic, rule-based data — NO LLM.
"""
from typing import Dict, List, Any

# ─────────────────────────────────────────────────────────────────────────────
# DESTINATIONS DATABASE
# ─────────────────────────────────────────────────────────────────────────────

DESTINATIONS: List[Dict[str, Any]] = [
    # ── INDIA ──────────────────────────────────────────────────────────────
    {
        "name": "Goa",
        "country": "India",
        "tags": ["beach", "party", "nightlife", "relaxation", "water_sports"],
        "group_types": ["friends", "couple", "solo"],
        "avg_cost_per_day": 2500,
        "best_months": [11, 12, 1, 2, 3],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "India's beach paradise known for stunning coastlines, vibrant nightlife, and Portuguese heritage.",
        "highlights": ["Baga Beach", "Calangute Beach", "Dudhsagar Falls", "Old Goa Churches", "Anjuna Flea Market"],
        "local_cuisine": ["Fish Curry Rice", "Bebinca", "Vindaloo", "Prawn Balchao", "Feni"],
        "travel_tips": [
            "Best time to visit is November to March",
            "Renting a scooter is the most convenient way to explore",
            "Carry cash for local shacks and markets"
        ],
        "weather": "Tropical — hot and humid. Best Oct–Mar. Avoid monsoon (Jun–Sep).",
        "nearby_airports": ["GOI (Goa International Airport)"],
        "popularity_score": 95,
    },
    {
        "name": "Kerala",
        "country": "India",
        "tags": ["nature", "backwaters", "culture", "relaxation", "ayurveda", "family"],
        "group_types": ["family", "couple", "solo"],
        "avg_cost_per_day": 3000,
        "best_months": [10, 11, 12, 1, 2, 3],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "God's Own Country — serene backwaters, lush greenery, and rich culture.",
        "highlights": ["Alleppey Backwaters", "Munnar Tea Gardens", "Periyar Wildlife", "Varkala Beach", "Kochi Fort"],
        "local_cuisine": ["Sadya", "Appam", "Fish Moilee", "Puttu & Kadala Curry", "Kerala Parotta"],
        "travel_tips": [
            "Book houseboats in advance for Alleppey",
            "Monsoon (June-Aug) creates lush scenery but limits activities",
            "Try an Ayurvedic massage — authentic and rejuvenating"
        ],
        "weather": "Tropical with monsoon. Best Oct–Feb. Monsoon Jun–Aug can be beautiful.",
        "nearby_airports": ["COK (Kochi)", "TRV (Trivandrum)", "CCJ (Kozhikode)"],
        "popularity_score": 90,
    },
    {
        "name": "Rajasthan",
        "country": "India",
        "tags": ["heritage", "culture", "desert", "forts", "palaces", "family"],
        "group_types": ["family", "couple", "friends", "solo"],
        "avg_cost_per_day": 2800,
        "best_months": [10, 11, 12, 1, 2, 3],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "The Land of Kings — magnificent forts, palaces, and the golden Thar desert.",
        "highlights": ["Jaipur Pink City", "Udaipur Lake Palace", "Jaisalmer Desert", "Ranthambore Tiger Reserve", "Jodhpur Blue City"],
        "local_cuisine": ["Dal Baati Churma", "Laal Maas", "Ghewar", "Ker Sangri", "Mawa Kachori"],
        "travel_tips": [
            "October to March is ideal — summers are scorching",
            "Hire a local guide in Jaipur for historical context",
            "Negotiate prices at markets"
        ],
        "weather": "Arid/semi-arid. Best Oct–Mar. Summers (Apr–Jun) extremely hot.",
        "nearby_airports": ["JAI (Jaipur)", "UDR (Udaipur)", "JDH (Jodhpur)"],
        "popularity_score": 88,
    },
    {
        "name": "Manali",
        "country": "India",
        "tags": ["adventure", "mountains", "snow", "trekking", "nature", "solo"],
        "group_types": ["friends", "couple", "solo"],
        "avg_cost_per_day": 2200,
        "best_months": [3, 4, 5, 6, 10, 11],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "A Himalayan paradise perfect for adventure seekers and nature lovers.",
        "highlights": ["Rohtang Pass", "Solang Valley", "Old Manali", "Hadimba Temple", "Beas River Rafting"],
        "local_cuisine": ["Dham", "Siddu", "Chha Gosht", "Aktori", "Tibetan Thukpa"],
        "travel_tips": [
            "Carry warm clothes even in summer — nights are cold",
            "Rohtang Pass requires a permit in advance",
            "Acclimatize before trekking to higher altitudes"
        ],
        "weather": "Mountain climate. Best Mar–Jun and Oct–Nov. Heavy snow Dec–Feb.",
        "nearby_airports": ["KUU (Kullu Manali Airport)"],
        "popularity_score": 85,
    },
    {
        "name": "Jaipur",
        "country": "India",
        "tags": ["heritage", "culture", "shopping", "forts", "family"],
        "group_types": ["family", "couple", "friends"],
        "avg_cost_per_day": 2000,
        "best_months": [10, 11, 12, 1, 2, 3],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "The Pink City — vibrant culture, stunning architecture, and world-class shopping.",
        "highlights": ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar", "Nahargarh Fort"],
        "local_cuisine": ["Dal Baati", "Pyaaz Kachori", "Mawa Kachori", "Ghewar", "Masala Chai"],
        "travel_tips": ["Visit Amber Fort early morning to avoid crowds", "Explore Bapu Bazaar for shopping"],
        "weather": "Semi-arid. Best Oct–Mar. Hot summers, mild winters.",
        "nearby_airports": ["JAI (Jaipur International)"],
        "popularity_score": 82,
    },
    {
        "name": "Andaman Islands",
        "country": "India",
        "tags": ["beach", "scuba", "nature", "island", "relaxation", "couple"],
        "group_types": ["couple", "friends", "family"],
        "avg_cost_per_day": 4000,
        "best_months": [11, 12, 1, 2, 3, 4, 5],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "Pristine islands with turquoise waters and world-class diving spots.",
        "highlights": ["Radhanagar Beach", "Cellular Jail", "Scuba Diving", "Havelock Island", "Ross Island"],
        "local_cuisine": ["Seafood", "Fish Curry", "Coconut Rice"],
        "travel_tips": ["Book inter-island ferries in advance", "Carry cash — ATMs limited"],
        "weather": "Tropical. Best Nov–May. Monsoon Jun–Sep.",
        "nearby_airports": ["IXZ (Port Blair)"],
        "popularity_score": 80,
    },
    {
        "name": "Rishikesh",
        "country": "India",
        "tags": ["adventure", "yoga", "spiritual", "trekking", "rafting", "solo"],
        "group_types": ["solo", "friends", "couple"],
        "avg_cost_per_day": 1800,
        "best_months": [3, 4, 5, 9, 10, 11],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "Yoga capital of the world with thrilling rafting and spiritual energy.",
        "highlights": ["River Rafting", "Laxman Jhula", "Triveni Ghat Aarti", "Neergarh Waterfall", "Beatles Ashram"],
        "local_cuisine": ["Chole Bhature", "Aloo Puri", "Lassi"],
        "travel_tips": ["Alcohol-free zone", "Best rafting season Feb–May"],
        "weather": "Subtropical. Best Mar–May and Sep–Nov. Monsoon Jun–Aug can be risky.",
        "nearby_airports": ["DED (Dehradun)"],
        "popularity_score": 78,
    },
    {
        "name": "Leh Ladakh",
        "country": "India",
        "tags": ["adventure", "mountains", "motorcycle", "trekking", "nature", "solo"],
        "group_types": ["solo", "friends"],
        "avg_cost_per_day": 3500,
        "best_months": [6, 7, 8, 9],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "High-altitude desert with stunning landscapes, Buddhist monasteries, and epic roads.",
        "highlights": ["Pangong Lake", "Nubra Valley", "Khardung La Pass", "Hemis Monastery", "Magnetic Hill"],
        "local_cuisine": ["Thukpa", "Skyu", "Butter Tea", "Momos", "Tsampa"],
        "travel_tips": [
            "Acclimatize for 2 days before any activity",
            "Plan for road closures — weather unpredictable",
            "Carry extra fuel and offline maps"
        ],
        "weather": "High-altitude desert. Accessible Jun–Sep. Frozen Oct–May.",
        "nearby_airports": ["IXL (Leh Airport)"],
        "popularity_score": 83,
    },
    {
        "name": "Mumbai",
        "country": "India",
        "tags": ["city", "culture", "food", "nightlife", "shopping", "family"],
        "group_types": ["friends", "family", "solo", "couple"],
        "avg_cost_per_day": 3500,
        "best_months": [11, 12, 1, 2, 3],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "The city that never sleeps — India's financial and entertainment capital.",
        "highlights": ["Gateway of India", "Marine Drive", "Elephanta Caves", "Dharavi", "Juhu Beach"],
        "local_cuisine": ["Vada Pav", "Pav Bhaji", "Bhel Puri", "Seafood Thali", "Bombay Duck"],
        "travel_tips": ["Use local trains for fast commute", "Evening at Marine Drive is a must"],
        "weather": "Tropical. Best Nov–Feb. Monsoon Jun–Sep transforms the city.",
        "nearby_airports": ["BOM (Chhatrapati Shivaji)"],
        "popularity_score": 85,
    },
    {
        "name": "Delhi",
        "country": "India",
        "tags": ["heritage", "culture", "food", "shopping", "history"],
        "group_types": ["family", "couple", "friends", "solo"],
        "avg_cost_per_day": 2500,
        "best_months": [10, 11, 12, 1, 2, 3],
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "description": "India's capital — a blend of Mughal history, colonial heritage, and modern culture.",
        "highlights": ["Red Fort", "Qutub Minar", "India Gate", "Humayun's Tomb", "Chandni Chowk"],
        "local_cuisine": ["Butter Chicken", "Parantha", "Chaat", "Kebabs", "Biryani"],
        "travel_tips": ["Use Delhi Metro for efficient travel", "Old Delhi is best explored by rickshaw"],
        "weather": "Semi-arid. Best Oct–Mar. Summers hot and humid. Winters foggy.",
        "nearby_airports": ["DEL (Indira Gandhi International)"],
        "popularity_score": 80,
    },
    # ── INTERNATIONAL ─────────────────────────────────────────────────────────
    {
        "name": "Bali",
        "country": "Indonesia",
        "tags": ["beach", "culture", "temple", "relaxation", "nightlife", "couple"],
        "group_types": ["couple", "friends", "solo"],
        "avg_cost_per_day": 4500,
        "best_months": [4, 5, 6, 7, 8, 9],
        "currency": "IDR",
        "timezone": "Asia/Makassar",
        "description": "Island of the Gods — lush rice terraces, ancient temples, and tropical beaches.",
        "highlights": ["Uluwatu Temple", "Tegalalang Rice Terrace", "Seminyak Beach", "Mount Batur", "Ubud Monkey Forest"],
        "local_cuisine": ["Babi Guling", "Nasi Goreng", "Satay", "Rendang", "Black Rice Pudding"],
        "travel_tips": ["Rent a scooter for flexibility", "Respect temple dress codes", "Best in dry season Apr–Sep"],
        "weather": "Tropical. Dry season Apr–Sep. Wet season Oct–Mar.",
        "nearby_airports": ["DPS (Ngurah Rai)"],
        "popularity_score": 95,
    },
    {
        "name": "Paris",
        "country": "France",
        "tags": ["culture", "art", "romance", "shopping", "food", "couple"],
        "group_types": ["couple", "friends", "family"],
        "avg_cost_per_day": 12000,
        "best_months": [4, 5, 6, 9, 10],
        "currency": "EUR",
        "timezone": "Europe/Paris",
        "description": "The City of Light — iconic art, cuisine, fashion, and romance.",
        "highlights": ["Eiffel Tower", "Louvre Museum", "Notre-Dame", "Montmartre", "Versailles"],
        "local_cuisine": ["Croissant", "Coq au Vin", "Ratatouille", "French Cheese", "Macarons"],
        "travel_tips": ["Buy museum pass for savings", "Avoid August crowds", "Use Metro for city transit"],
        "weather": "Oceanic. Mild and pleasant Apr–Jun and Sep–Oct.",
        "nearby_airports": ["CDG (Charles de Gaulle)", "ORY (Orly)"],
        "popularity_score": 98,
    },
    {
        "name": "Dubai",
        "country": "UAE",
        "tags": ["luxury", "shopping", "beach", "culture", "family", "adventure"],
        "group_types": ["family", "couple", "friends"],
        "avg_cost_per_day": 15000,
        "best_months": [11, 12, 1, 2, 3],
        "currency": "AED",
        "timezone": "Asia/Dubai",
        "description": "Futuristic luxury city — tallest buildings, world-class malls, and desert adventures.",
        "highlights": ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Desert Safari", "Dubai Creek"],
        "local_cuisine": ["Shawarma", "Hummus", "Lamb Biryani", "Camel Milk",  "Luqaimat"],
        "travel_tips": ["Book Burj Khalifa in advance", "Dress conservatively", "Best Nov–Mar"],
        "weather": "Desert. Best Nov–Mar. Extremely hot Apr–Oct.",
        "nearby_airports": ["DXB (Dubai International)"],
        "popularity_score": 92,
    },
    {
        "name": "Singapore",
        "country": "Singapore",
        "tags": ["city", "food", "culture", "family", "shopping", "clean"],
        "group_types": ["family", "friends", "couple", "solo"],
        "avg_cost_per_day": 10000,
        "best_months": [2, 3, 6, 7, 8],
        "currency": "SGD",
        "timezone": "Asia/Singapore",
        "description": "The Lion City — ultra-modern, immaculately clean, and incredibly diverse cuisine.",
        "highlights": ["Marina Bay Sands", "Gardens by the Bay", "Sentosa Island", "Chinatown", "Universal Studios"],
        "local_cuisine": ["Chilli Crab", "Hainanese Chicken Rice", "Laksa", "Char Kway Teow", "Bak Kut Teh"],
        "travel_tips": ["MRT is excellent for transport", "Try hawker centres for authentic food"],
        "weather": "Equatorial — hot and humid year-round. Less rain Feb–Apr and Jun–Aug.",
        "nearby_airports": ["SIN (Changi Airport)"],
        "popularity_score": 90,
    },
    {
        "name": "Bangkok",
        "country": "Thailand",
        "tags": ["city", "food", "culture", "nightlife", "temple", "budget"],
        "group_types": ["friends", "solo", "couple"],
        "avg_cost_per_day": 5000,
        "best_months": [11, 12, 1, 2, 3],
        "currency": "THB",
        "timezone": "Asia/Bangkok",
        "description": "Vibrant city of angels — temples, street food, and electrifying nightlife.",
        "highlights": ["Grand Palace", "Wat Pho", "Chatuchak Market", "Khao San Road", "Chao Phraya River"],
        "local_cuisine": ["Pad Thai", "Som Tum", "Tom Yum", "Mango Sticky Rice", "Green Curry"],
        "travel_tips": ["BTS Skytrain avoids traffic", "Tuk-tuks for short distances", "Bargain shopping"],
        "weather": "Tropical. Best Nov–Mar. Hot Apr–Jun. Monsoon Jul–Oct.",
        "nearby_airports": ["BKK (Suvarnabhumi)", "DMK (Don Mueang)"],
        "popularity_score": 88,
    },
    {
        "name": "Maldives",
        "country": "Maldives",
        "tags": ["beach", "luxury", "romance", "scuba", "relaxation", "couple"],
        "group_types": ["couple", "solo"],
        "avg_cost_per_day": 25000,
        "best_months": [11, 12, 1, 2, 3, 4],
        "currency": "USD",
        "timezone": "Indian/Maldives",
        "description": "Paradise on Earth — overwater bungalows, crystal-clear lagoons, and pristine coral reefs.",
        "highlights": ["Overwater Bungalows", "Snorkeling with Manta Rays", "Bioluminescent Beach", "Submarine Diving", "Island Hopping"],
        "local_cuisine": ["Mas Huni", "Garudhiya", "Bis Keemiya", "Bondi"],
        "travel_tips": ["Book resorts directly for best rates", "Travel Nov–Apr for clear skies"],
        "weather": "Tropical. Dry Nov–Apr. Wet May–Oct.",
        "nearby_airports": ["MLE (Velana International)"],
        "popularity_score": 93,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# TRANSPORT DATABASE
# ─────────────────────────────────────────────────────────────────────────────

def get_transport_options(source: str, destination: str, num_travelers: int) -> List[Dict]:
    """
    Rule-based transport selection.
    Returns list of transport options sorted by cost.
    """
    src = source.strip().lower()
    dest = destination.strip().lower()

    # Major Indian route cost table (one-way per person in INR)
    FLIGHT_COSTS: Dict[str, Dict[str, int]] = {
        "mumbai": {"goa": 3500, "delhi": 4500, "jaipur": 4000, "kerala": 5000, "manali": 8000,
                   "leh ladakh": 9000, "andaman islands": 8000, "rishikesh": 5500, "rajasthan": 4000,
                   "bali": 18000, "dubai": 22000, "singapore": 20000, "paris": 45000, "bangkok": 15000, "maldives": 25000},
        "delhi": {"goa": 5000, "mumbai": 4500, "jaipur": 2000, "kerala": 6000, "manali": 3500,
                   "leh ladakh": 7000, "andaman islands": 9000, "rishikesh": 2500, "rajasthan": 2000,
                   "bali": 20000, "dubai": 18000, "singapore": 22000, "paris": 48000, "bangkok": 17000, "maldives": 28000},
        "bangalore": {"goa": 3000, "mumbai": 3500, "delhi": 5000, "jaipur": 5500, "kerala": 4000,
                      "manali": 9000, "leh ladakh": 10000, "andaman islands": 7000, "rishikesh": 6500, "rajasthan": 5000,
                      "bali": 19000, "dubai": 20000, "singapore": 18000, "paris": 46000, "bangkok": 16000, "maldives": 24000},
        "hyderabad": {"goa": 3500, "mumbai": 4000, "delhi": 5000, "kerala": 4500, "jaipur": 5000,
                      "bali": 19000, "dubai": 21000, "singapore": 19000, "paris": 47000, "bangkok": 17000, "maldives": 25000},
        "chennai": {"goa": 4000, "mumbai": 4000, "delhi": 5500, "kerala": 3500, "andaman islands": 5000,
                    "bali": 18000, "dubai": 20000, "singapore": 17000, "paris": 46000, "bangkok": 15000, "maldives": 23000},
        "kolkata": {"goa": 5500, "mumbai": 5000, "delhi": 4000, "kerala": 6000, "andaman islands": 6000,
                    "bali": 20000, "dubai": 22000, "singapore": 19000, "paris": 48000, "bangkok": 16000, "maldives": 27000},
        "pune": {"goa": 2500, "mumbai": 1500, "delhi": 4500, "kerala": 5000, "jaipur": 4500,
                 "bali": 18500, "dubai": 21000, "singapore": 19500, "paris": 46000},
        "ahmedabad": {"goa": 4000, "mumbai": 2500, "delhi": 3500, "kerala": 6000, "rajasthan": 2500,
                      "dubai": 18000, "singapore": 21000},
        "kochi": {"goa": 4000, "mumbai": 5000, "delhi": 6000, "bali": 17000, "dubai": 17000, "singapore": 16000},
        "jaipur": {"delhi": 2000, "mumbai": 4000, "goa": 5000, "kerala": 6000},
    }

    # Train durations (hours) for common routes
    TRAIN_DURATIONS: Dict[str, Dict[str, float]] = {
        "mumbai": {"goa": 10, "delhi": 16, "jaipur": 18, "rajasthan": 18},
        "delhi": {"jaipur": 5, "goa": 24, "manali": 12, "rishikesh": 5, "rajasthan": 5, "mumbai": 16},
        "bangalore": {"goa": 9, "mumbai": 24, "chennai": 6, "kerala": 12},
        "hyderabad": {"goa": 14, "mumbai": 16, "chennai": 9},
        "kolkata": {"delhi": 17, "mumbai": 30},
    }

    # Bus durations (hours) for short routes
    BUS_DURATIONS: Dict[str, Dict[str, float]] = {
        "mumbai": {"goa": 9, "pune": 3, "nashik": 4},
        "delhi": {"jaipur": 6, "manali": 14, "rishikesh": 6, "agra": 4, "rajasthan": 7},
        "bangalore": {"goa": 10, "mysore": 3, "kerala": 10},
        "pune": {"goa": 7, "mumbai": 3},
    }

    # Destination lookup (normalize common city references)
    dest_key = dest.replace(" ", " ")
    src_key = src.replace(" ", " ")

    options = []

    # Flight price (look up by source city key, then by destination city key)
    flight_price = None
    for src_match, dest_map in FLIGHT_COSTS.items():
        if src_match in src_key or src_key in src_match:
            for dest_match, price in dest_map.items():
                if dest_match in dest_key or dest_key in dest_match:
                    flight_price = price
                    break
        if flight_price:
            break

    if not flight_price:
        # Try reverse lookup
        for src_match, dest_map in FLIGHT_COSTS.items():
            if src_match in dest_key or dest_key in src_match:
                for dest_match, price in dest_map.items():
                    if dest_match in src_key or src_key in dest_match:
                        flight_price = price
                        break
            if flight_price:
                break

    if not flight_price:
        # Default: estimate based on trip type
        is_international = any(c["name"].lower() in dest_key for c in DESTINATIONS if c.get("country") != "India")
        flight_price = 18000 if is_international else 5500

    flight_duration = 2.5 if "international" not in src else 10
    for dest_name in DESTINATIONS:
        if dest_name["name"].lower() in dest_key and dest_name.get("country") != "India":
            flight_duration = 7.0
            break

    options.append({
        "mode": "Flight",
        "provider": "Domestic Carrier",
        "cost_per_person": float(flight_price),
        "total_cost": float(flight_price * num_travelers),
        "duration_hours": flight_duration,
        "departure": "Morning departure available",
        "details": f"Economy class — 1 check-in bag included. Book 4+ weeks ahead for best fares.",
        "best_for": "Speed and comfort",
        "comfort_rating": 4,
        "environmental_score": 2,
    })

    # Train option (only for domestic routes with known durations)
    train_hours = None
    for src_match, dest_map in TRAIN_DURATIONS.items():
        if src_match in src_key or src_key in src_match:
            for dest_match, hours in dest_map.items():
                if dest_match in dest_key or dest_key in dest_match:
                    train_hours = hours
                    break
    if not train_hours:
        for src_match, dest_map in TRAIN_DURATIONS.items():
            if src_match in dest_key:
                for dest_match, hours in dest_map.items():
                    if dest_match in src_key:
                        train_hours = hours
                        break

    if train_hours:
        # Train prices are significantly cheaper
        train_price = max(400, int(flight_price * 0.25))
        rooms_needed = max(1, (num_travelers + 3) // 4)  # 4 berths per compartment
        options.append({
            "mode": "Train",
            "provider": "Indian Railways (Rajdhani/Shatabdi)",
            "cost_per_person": float(train_price),
            "total_cost": float(train_price * num_travelers),
            "duration_hours": train_hours,
            "departure": "Multiple daily services available",
            "details": f"Sleeper or AC class. {rooms_needed} compartment(s) for {num_travelers} travelers. Scenic, comfortable journey.",
            "best_for": "Budget and experience",
            "comfort_rating": 3,
            "environmental_score": 5,
        })

    # Bus option (only for short routes)
    bus_hours = None
    for src_match, dest_map in BUS_DURATIONS.items():
        if src_match in src_key or src_key in src_match:
            for dest_match, hours in dest_map.items():
                if dest_match in dest_key or dest_key in dest_match:
                    bus_hours = hours
                    break

    if bus_hours:
        bus_price = max(200, int(flight_price * 0.12))
        options.append({
            "mode": "Bus",
            "provider": "Luxury Coach Service",
            "cost_per_person": float(bus_price),
            "total_cost": float(bus_price * num_travelers),
            "duration_hours": bus_hours,
            "departure": "Evening departures available (overnight options)",
            "details": f"Luxury sleeper coach with AC, charging ports, and snacks. Great value for short routes.",
            "best_for": "Cheapest option",
            "comfort_rating": 3,
            "environmental_score": 4,
        })

    # Car rental (always available, best for small groups)
    if num_travelers <= 7:
        car_fuel_cost = max(1500, int((flight_price * 0.4) * (1 + (num_travelers - 1) * 0.1)))
        per_person_car = round(car_fuel_cost / num_travelers)
        car_note = "Innova Crysta or similar SUV" if num_travelers > 4 else "Sedan (Swift Dzire or similar)"
        est_hours = train_hours or bus_hours or 8
        options.append({
            "mode": "Self-Drive / Cab",
            "provider": "Zoomcar / Local Rental",
            "cost_per_person": float(per_person_car),
            "total_cost": float(car_fuel_cost),
            "duration_hours": est_hours + 1.0,
            "departure": "Flexible — depart anytime",
            "details": f"{car_note}. Fuel + tolls included estimate. Offers maximum flexibility for sightseeing en route.",
            "best_for": "Flexibility and groups",
            "comfort_rating": 4,
            "environmental_score": 2,
        })

    # Sort by cost
    options.sort(key=lambda x: x["cost_per_person"])
    return options


# ─────────────────────────────────────────────────────────────────────────────
# STAY DATABASE
# ─────────────────────────────────────────────────────────────────────────────

STAY_TYPES = {
    "hostel": {
        "label": "Hostel / Dorm",
        "cost_per_night_per_person": 600,
        "cost_multiplier": 1.0,
        "amenities": ["Wi-Fi", "Shared bathroom", "Common kitchen", "Locker"],
        "best_for": "Solo travelers and backpackers",
        "privacy": "Shared",
        "rating": 3.2,
    },
    "budget_hotel": {
        "label": "Budget Hotel",
        "cost_per_night_per_person": 1200,
        "cost_multiplier": 1.0,
        "amenities": ["Wi-Fi", "AC", "Private bathroom", "TV"],
        "best_for": "Budget-conscious travelers",
        "privacy": "Private",
        "rating": 3.6,
    },
    "mid_range": {
        "label": "3-Star Hotel",
        "cost_per_night_per_person": 2500,
        "cost_multiplier": 1.0,
        "amenities": ["Wi-Fi", "Pool", "Restaurant", "AC", "Room service", "Gym"],
        "best_for": "Comfortable stays",
        "privacy": "Private",
        "rating": 4.0,
    },
    "premium": {
        "label": "4-Star Hotel",
        "cost_per_night_per_person": 5000,
        "cost_multiplier": 1.0,
        "amenities": ["Wi-Fi", "Spa", "Multiple restaurants", "Pool", "Concierge", "24hr room service"],
        "best_for": "Premium comfort and business travelers",
        "privacy": "Private suite",
        "rating": 4.4,
    },
    "luxury": {
        "label": "5-Star Resort",
        "cost_per_night_per_person": 12000,
        "cost_multiplier": 1.0,
        "amenities": ["Private pool", "Butler service", "Fine dining", "Spa", "Beach access", "Airport transfer"],
        "best_for": "Honeymoon and luxury seekers",
        "privacy": "Private villa",
        "rating": 4.8,
    },
}

# Destination-specific hotel name overrides (for display quality)
HOTEL_NAMES: Dict[str, Dict[str, List[str]]] = {
    "Goa": {
        "hostel": ["Zostel Goa", "Jungle Hostel Anjuna", "Banyan Soul Hostel"],
        "budget_hotel": ["Hotel Mandovi", "Cavala Boutique Hotel", "La Paz Gardens"],
        "mid_range": ["WB by The Fern Goa", "Radisson Blu Resort", "Park Inn by Radisson"],
        "premium": ["Novotel Goa Resort", "Alila Diwa Goa", "Hyatt Centric Goa"],
        "luxury": ["Taj Exotica Goa", "The Leela Goa", "W Goa"],
    },
    "Kerala": {
        "hostel": ["Backwater Hostel", "The Cochin Hostel", "Zostel Varkala"],
        "budget_hotel": ["Hotel Greenland", "Bastion Bungalow", "Old Harbour Hotel"],
        "mid_range": ["Casino Hotel Kochi", "Gokulam Park Inn", "Fragrant Nature"],
        "premium": ["Vivanta Kovalam", "Niraamaya Retreats", "CGH Earth"],
        "luxury": ["Taj Malabar Kochi", "Kumarakom Lake Resort", "Marari Beach Resort"],
    },
    "Rajasthan": {
        "hostel": ["Zostel Jaipur", "Moustache Hostel Jaipur", "Moustache Jodhpur"],
        "budget_hotel": ["Hotel Pearl Palace", "Arya Niwas", "Umaid Bhawan"],
        "mid_range": ["Jaipur Marriott", "Ramada by Wyndham", "Holiday Inn Express"],
        "premium": ["Dera Mandawa", "Fairmont Jaipur", "Trident Jaipur"],
        "luxury": ["Rambagh Palace", "Umaid Bhawan Palace", "The Oberoi Rajputana"],
    },
    "Manali": {
        "hostel": ["Zostel Manali", "The Hosteller Manali", "Snow Hostel"],
        "budget_hotel": ["Hotel Snowflake", "Beas Inn", "Hotel Blue Tope"],
        "mid_range": ["Solang Valley Resort", "Sarthak Regency", "Hotel Pinewood"],
        "premium": ["Manuallaya Resort & Spa", "Span Resort Manali", "Banon Resort"],
        "luxury": ["Solang Valley Resort Deluxe", "Himalayan Abode"],
    },
    "Bali": {
        "hostel": ["Seminyak Square Hostel", "Puri Garden Hostel", "Capsule Hostel Ubud"],
        "budget_hotel": ["Bali Aroma Exclusive Villa", "Adi's Bisma Cottage"],
        "mid_range": ["Pullman Bali Legian Beach", "Kutabex Hotel", "Kuta Paradiso"],
        "premium": ["The St. Regis Bali Resort", "Conrad Bali"],
        "luxury": ["AYANA Resort Bali", "Four Seasons Bali", "Amankila"],
    },
    "Dubai": {
        "hostel": ["Dream Hostel Dubai", "Yha Downtown Dubai"],
        "budget_hotel": ["Fortune Grand Hotel", "Arabian Courtyard Hotel"],
        "mid_range": ["Premier Inn Dubai", "Rove Downtown Dubai"],
        "premium": ["Marriott Downtown Dubai", "Sofitel Dubai Downtown"],
        "luxury": ["Burj Al Arab", "Atlantis The Palm", "One&Only Royal Mirage"],
    },
    "Singapore": {
        "hostel": ["The Hive Hostel", "Five Stones Hostel", "Footprints Hostel"],
        "budget_hotel": ["Hotel 81", "Fragrance Hotel", "V Hotel Bencoolen"],
        "mid_range": ["Holiday Inn Singapore", "Hilton Garden Inn"],
        "premium": ["Fairmont Singapore", "Swissôtel The Stamford"],
        "luxury": ["Marina Bay Sands", "The Fullerton Hotel", "Capella Singapore"],
    },
}

def _get_hotel_name(destination: str, tier: str) -> str:
    for dest_key in HOTEL_NAMES:
        if dest_key.lower() in destination.lower() or destination.lower() in dest_key.lower():
            names = HOTEL_NAMES[dest_key].get(tier, [])
            if names:
                import random
                return random.choice(names)
    return STAY_TYPES[tier]["label"]

def get_stay_options(destination: str, nights: int, num_travelers: int, budget_per_person: float) -> List[Dict]:
    """Generate stay options using rule-based tier selection."""
    
    options = []
    # Determine rooms: 2 persons per room
    rooms = max(1, (num_travelers + 1) // 2)

    for tier_key, tier in STAY_TYPES.items():
        # Apply destination cost multiplier (international destinations cost more)
        dest_multiplier = 1.0
        for d in DESTINATIONS:
            if d["name"].lower() in destination.lower():
                # International destinations: multiply by 1.5-3x
                if d["country"] != "India":
                    dest_multiplier = 1.8
                else:
                    dest_multiplier = 1.0
                break

        price_per_room = tier["cost_per_night_per_person"] * dest_multiplier
        total_per_night = price_per_room * rooms
        total_stay = total_per_night * nights
        per_person_total = total_stay / num_travelers

        options.append({
            "tier": tier_key,
            "name": _get_hotel_name(destination, tier_key),
            "type": tier["label"],
            "price_per_room_per_night": round(price_per_room),
            "rooms_required": rooms,
            "total_per_night": round(total_per_night),
            "total_stay_cost": round(total_stay),
            "cost_per_person": round(per_person_total),
            "nights": nights,
            "amenities": tier["amenities"],
            "best_for": tier["best_for"],
            "privacy": tier["privacy"],
            "rating": tier["rating"],
            "location": f"Central {destination}",
        })

    return options


# ─────────────────────────────────────────────────────────────────────────────
# PLACES DATABASE
# ─────────────────────────────────────────────────────────────────────────────

PLACES_BY_DESTINATION: Dict[str, List[Dict]] = {
    "Goa": [
        {"name": "Baga Beach", "type": "beach", "avg_time_hrs": 3, "group_types": ["friends", "couple", "solo"], "cost": 0, "best_time": "Morning or Sunset"},
        {"name": "Calangute Beach", "type": "beach", "avg_time_hrs": 2, "group_types": ["family", "friends"], "cost": 0, "best_time": "Morning"},
        {"name": "Fort Aguada", "type": "heritage", "avg_time_hrs": 1.5, "group_types": ["all"], "cost": 50, "best_time": "Afternoon"},
        {"name": "Dudhsagar Falls", "type": "nature", "avg_time_hrs": 5, "group_types": ["friends", "couple", "solo"], "cost": 400, "best_time": "Morning"},
        {"name": "Old Goa Churches", "type": "heritage", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": "Anjuna Flea Market", "type": "market", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Afternoon"},
        {"name": "Vagator Beach Sunset", "type": "beach", "avg_time_hrs": 1.5, "group_types": ["couple", "solo", "friends"], "cost": 0, "best_time": "Sunset"},
        {"name": "Chapora Fort", "type": "heritage", "avg_time_hrs": 1, "group_types": ["all"], "cost": 0, "best_time": "Sunset"},
        {"name": "Candolim Beach", "type": "beach", "avg_time_hrs": 2, "group_types": ["family", "couple"], "cost": 0, "best_time": "Morning"},
        {"name": "Spice Plantation Tour", "type": "culture", "avg_time_hrs": 3, "group_types": ["family", "couple"], "cost": 600, "best_time": "Morning"},
        {"name": "Water Sports at Calangute", "type": "adventure", "avg_time_hrs": 2, "group_types": ["friends", "solo"], "cost": 1000, "best_time": "Morning"},
        {"name": "Saturday Night Market", "type": "nightlife", "avg_time_hrs": 3, "group_types": ["friends", "couple", "solo"], "cost": 0, "best_time": "Evening"},
        {"name": "Fontainhas (Latin Quarter)", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Afternoon"},
    ],
    "Kerala": [
        {"name": "Alleppey Houseboat Cruise", "type": "nature", "avg_time_hrs": 8, "group_types": ["all"], "cost": 4000, "best_time": "Full Day"},
        {"name": "Munnar Tea Gardens", "type": "nature", "avg_time_hrs": 4, "group_types": ["all"], "cost": 200, "best_time": "Morning"},
        {"name": "Periyar Wildlife Sanctuary", "type": "nature", "avg_time_hrs": 5, "group_types": ["family", "couple", "solo"], "cost": 600, "best_time": "Morning"},
        {"name": "Varkala Beach", "type": "beach", "avg_time_hrs": 3, "group_types": ["couple", "solo"], "cost": 0, "best_time": "Morning"},
        {"name": "Fort Kochi", "type": "heritage", "avg_time_hrs": 3, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": "Mattancherry Palace", "type": "heritage", "avg_time_hrs": 1.5, "group_types": ["all"], "cost": 10, "best_time": "Morning"},
        {"name": "Kathakali Dance Performance", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 400, "best_time": "Evening"},
        {"name": "Wayanad Waterfalls", "type": "nature", "avg_time_hrs": 4, "group_types": ["friends", "couple"], "cost": 100, "best_time": "Morning"},
    ],
    "Rajasthan": [
        {"name": "Amber Fort Jaipur", "type": "heritage", "avg_time_hrs": 3, "group_types": ["all"], "cost": 500, "best_time": "Morning"},
        {"name": "Hawa Mahal", "type": "heritage", "avg_time_hrs": 1, "group_types": ["all"], "cost": 50, "best_time": "Morning"},
        {"name": "City Palace Jaipur", "type": "heritage", "avg_time_hrs": 2, "group_types": ["all"], "cost": 300, "best_time": "Morning"},
        {"name": "Jaisalmer Desert Safari", "type": "adventure", "avg_time_hrs": 6, "group_types": ["friends", "couple", "solo"], "cost": 2000, "best_time": "Afternoon / Overnight"},
        {"name": "Udaipur Lake Pichola Boat", "type": "nature", "avg_time_hrs": 1, "group_types": ["couple", "family"], "cost": 400, "best_time": "Sunset"},
        {"name": "Jodhpur Blue City", "type": "heritage", "avg_time_hrs": 4, "group_types": ["all"], "cost": 600, "best_time": "Morning"},
        {"name": "Ranthambore Safari", "type": "adventure", "avg_time_hrs": 4, "group_types": ["family", "couple", "solo"], "cost": 1500, "best_time": "Early Morning"},
        {"name": "Jantar Mantar Jaipur", "type": "heritage", "avg_time_hrs": 1.5, "group_types": ["all"], "cost": 200, "best_time": "Morning"},
    ],
    "Manali": [
        {"name": "Solang Valley Snow Activities", "type": "adventure", "avg_time_hrs": 5, "group_types": ["friends", "couple", "solo"], "cost": 1500, "best_time": "Morning"},
        {"name": "Rohtang Pass", "type": "nature", "avg_time_hrs": 6, "group_types": ["all"], "cost": 200, "best_time": "Morning (permit required)"},
        {"name": "Hadimba Temple", "type": "heritage", "avg_time_hrs": 1, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": "Old Manali Stroll", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Afternoon"},
        {"name": "Beas River Rafting", "type": "adventure", "avg_time_hrs": 3, "group_types": ["friends", "solo"], "cost": 800, "best_time": "Morning"},
        {"name": "Jogini Waterfall Trek", "type": "adventure", "avg_time_hrs": 4, "group_types": ["friends", "solo", "couple"], "cost": 300, "best_time": "Morning"},
        {"name": "Naggar Castle", "type": "heritage", "avg_time_hrs": 2, "group_types": ["all"], "cost": 100, "best_time": "Afternoon"},
        {"name": "Van Vihar National Park", "type": "nature", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
    ],
    "Bali": [
        {"name": "Uluwatu Temple Sunset", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 80000, "best_time": "Sunset"},
        {"name": "Tegalalang Rice Terrace", "type": "nature", "avg_time_hrs": 2, "group_types": ["all"], "cost": 50000, "best_time": "Morning"},
        {"name": "Kecak Fire Dance", "type": "culture", "avg_time_hrs": 1.5, "group_types": ["all"], "cost": 100000, "best_time": "Evening"},
        {"name": "Mount Batur Sunrise Trek", "type": "adventure", "avg_time_hrs": 6, "group_types": ["friends", "solo", "couple"], "cost": 300000, "best_time": "Early Morning"},
        {"name": "Ubud Monkey Forest", "type": "nature", "avg_time_hrs": 2, "group_types": ["all"], "cost": 80000, "best_time": "Morning"},
        {"name": "Seminyak Beach", "type": "beach", "avg_time_hrs": 3, "group_types": ["friends", "couple", "solo"], "cost": 0, "best_time": "Afternoon"},
        {"name": "Tanah Lot Temple", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 60000, "best_time": "Sunset"},
        {"name": "Ubud Traditional Market", "type": "market", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
    ],
    "Dubai": [
        {"name": "Burj Khalifa Observation Deck", "type": "landmark", "avg_time_hrs": 2, "group_types": ["all"], "cost": 180, "best_time": "Sunset"},
        {"name": "Dubai Mall Shopping", "type": "shopping", "avg_time_hrs": 4, "group_types": ["family", "friends"], "cost": 0, "best_time": "Afternoon"},
        {"name": "Desert Safari", "type": "adventure", "avg_time_hrs": 7, "group_types": ["all"], "cost": 180, "best_time": "Afternoon / Evening"},
        {"name": "Dubai Creek & Old Souk", "type": "culture", "avg_time_hrs": 3, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": "Palm Jumeirah Tour", "type": "landmark", "avg_time_hrs": 2, "group_types": ["all"], "cost": 50, "best_time": "Afternoon"},
        {"name": "Dubai Frame", "type": "landmark", "avg_time_hrs": 1.5, "group_types": ["all"], "cost": 50, "best_time": "Morning"},
        {"name": "Aquaventure Waterpark", "type": "adventure", "avg_time_hrs": 6, "group_types": ["family", "friends"], "cost": 300, "best_time": "Full Day"},
    ],
    "Singapore": [
        {"name": "Marina Bay Sands SkyPark", "type": "landmark", "avg_time_hrs": 2, "group_types": ["all"], "cost": 26, "best_time": "Sunset"},
        {"name": "Gardens by the Bay", "type": "nature", "avg_time_hrs": 3, "group_types": ["all"], "cost": 28, "best_time": "Evening Light Show"},
        {"name": "Universal Studios", "type": "adventure", "avg_time_hrs": 8, "group_types": ["family", "friends"], "cost": 79, "best_time": "Full Day"},
        {"name": "Sentosa Island", "type": "beach", "avg_time_hrs": 4, "group_types": ["all"], "cost": 0, "best_time": "Afternoon"},
        {"name": "Chinatown & Hawker Food", "type": "culture", "avg_time_hrs": 3, "group_types": ["all"], "cost": 0, "best_time": "Evening"},
        {"name": "Little India", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": "Night Safari", "type": "nature", "avg_time_hrs": 3, "group_types": ["family", "friends"], "cost": 55, "best_time": "Evening"},
    ],
}

def get_places_for_destination(destination: str) -> List[Dict]:
    """Get places list for destination with fallback."""
    for key in PLACES_BY_DESTINATION:
        if key.lower() in destination.lower() or destination.lower() in key.lower():
            return PLACES_BY_DESTINATION[key]

    # Generic fallback places for unknown destinations
    return [
        {"name": f"{destination} City Center", "type": "landmark", "avg_time_hrs": 2, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": f"{destination} Local Market", "type": "market", "avg_time_hrs": 1.5, "group_types": ["all"], "cost": 0, "best_time": "Morning"},
        {"name": f"{destination} Heritage Museum", "type": "heritage", "avg_time_hrs": 2, "group_types": ["all"], "cost": 200, "best_time": "Afternoon"},
        {"name": f"Sunset Point {destination}", "type": "nature", "avg_time_hrs": 1, "group_types": ["all"], "cost": 0, "best_time": "Sunset"},
        {"name": f"{destination} Adventure Park", "type": "adventure", "avg_time_hrs": 4, "group_types": ["friends", "family"], "cost": 800, "best_time": "Morning"},
        {"name": f"Local Food Walk {destination}", "type": "culture", "avg_time_hrs": 2, "group_types": ["all"], "cost": 500, "best_time": "Evening"},
    ]
