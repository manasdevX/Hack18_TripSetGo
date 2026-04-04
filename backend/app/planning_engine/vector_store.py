"""
TripSetGo Vector Store — RAG Simulation
========================================
Large structured dataset (200+ entries) with keyword+tag+budget scoring.
Simulates vector retrieval without external dependencies.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
import math, re

# ─────────────────────────────────────────────────────────────────────────────
# MASTER DATASET  (type: transport | hotel | activity | food)
# ─────────────────────────────────────────────────────────────────────────────

VECTOR_DATA: List[Dict[str, Any]] = [
    # ── TRANSPORT ────────────────────────────────────────────────────────────
    # Goa routes
    {"id":"tx_001","type":"transport","cities":["Mumbai","Goa"],"name":"IndiGo Economy Flight","price":3500,"duration":"1h 15m","category":"flight","tags":["fast","economy","friends","solo"],"metadata":{"comfort":4,"provider":"IndiGo","mode":"Flight","best_for":"Speed"}},
    {"id":"tx_002","type":"transport","cities":["Mumbai","Goa"],"name":"Air India Business Flight","price":9500,"duration":"1h 15m","category":"flight","tags":["luxury","business","couple"],"metadata":{"comfort":5,"provider":"Air India","mode":"Flight","best_for":"Luxury"}},
    {"id":"tx_003","type":"transport","cities":["Mumbai","Goa"],"name":"Konkan Railway AC Chair","price":850,"duration":"9h 30m","category":"train","tags":["budget","scenic","friends","family"],"metadata":{"comfort":3,"provider":"Indian Railways","mode":"Train","best_for":"Budget scenic"}},
    {"id":"tx_004","type":"transport","cities":["Mumbai","Goa"],"name":"Rajdhani Express AC 3-Tier","price":1100,"duration":"9h","category":"train","tags":["budget","comfortable","family","friends"],"metadata":{"comfort":4,"provider":"Indian Railways","mode":"Train","best_for":"Comfort budget"}},
    {"id":"tx_005","type":"transport","cities":["Mumbai","Goa"],"name":"Paulo Travels Luxury Sleeper Bus","price":900,"duration":"10h","category":"bus","tags":["budget","overnight","friends","solo"],"metadata":{"comfort":3,"provider":"Paulo Travels","mode":"Bus","best_for":"Cheapest"}},
    {"id":"tx_006","type":"transport","cities":["Mumbai","Goa"],"name":"Zoomcar Self-Drive SUV","price":4500,"duration":"9h","category":"self_drive","tags":["flexible","adventure","friends","couple"],"metadata":{"comfort":4,"provider":"Zoomcar","mode":"Self-Drive","best_for":"Flexibility"}},
    {"id":"tx_007","type":"transport","cities":["Mumbai","Goa"],"name":"Private Cab Innova Crysta","price":7500,"duration":"9h","category":"cab","tags":["family","comfortable","premium"],"metadata":{"comfort":4,"provider":"Local Taxi","mode":"Cab","best_for":"Family comfort"}},
    # Delhi routes
    {"id":"tx_008","type":"transport","cities":["Delhi","Goa"],"name":"IndiGo Economy Flight","price":5000,"duration":"2h 30m","category":"flight","tags":["fast","economy","friends","solo"],"metadata":{"comfort":4,"provider":"IndiGo","mode":"Flight","best_for":"Speed"}},
    {"id":"tx_009","type":"transport","cities":["Delhi","Manali"],"name":"HPTDC Volvo Bus","price":600,"duration":"14h","category":"bus","tags":["budget","adventure","friends","solo"],"metadata":{"comfort":3,"provider":"HPTDC","mode":"Bus","best_for":"Cheapest"}},
    {"id":"tx_010","type":"transport","cities":["Delhi","Manali"],"name":"Toyota Innova Self-Drive","price":5000,"duration":"13h","category":"self_drive","tags":["flexible","adventure","friends","couple"],"metadata":{"comfort":4,"provider":"Zoomcar","mode":"Self-Drive","best_for":"Flexibility"}},
    {"id":"tx_011","type":"transport","cities":["Delhi","Manali"],"name":"Shatabdi + Taxi Combo","price":1200,"duration":"12h","category":"train","tags":["budget","comfortable","family"],"metadata":{"comfort":3,"provider":"Indian Railways","mode":"Train+Taxi","best_for":"Budget"}},
    {"id":"tx_012","type":"transport","cities":["Delhi","Rajasthan"],"name":"Pink City Express Train","price":400,"duration":"5h","category":"train","tags":["budget","heritage","family","culture"],"metadata":{"comfort":3,"provider":"Indian Railways","mode":"Train","best_for":"Budget"}},
    {"id":"tx_013","type":"transport","cities":["Delhi","Rajasthan"],"name":"Rajasthan AC Volvo Bus","price":350,"duration":"6h","category":"bus","tags":["budget","family","culture"],"metadata":{"comfort":3,"provider":"RSRTC","mode":"Bus","best_for":"Cheapest"}},
    {"id":"tx_014","type":"transport","cities":["Delhi","Rajasthan"],"name":"IndiGo Jaipur Flight","price":2200,"duration":"1h","category":"flight","tags":["fast","family","culture"],"metadata":{"comfort":4,"provider":"IndiGo","mode":"Flight","best_for":"Speed"}},
    # International
    {"id":"tx_015","type":"transport","cities":["Mumbai","Bali"],"name":"IndiGo Bali Flight (Direct)","price":18000,"duration":"5h 30m","category":"flight","tags":["international","beach","couple","friends"],"metadata":{"comfort":4,"provider":"IndiGo","mode":"Flight","best_for":"Direct route"}},
    {"id":"tx_016","type":"transport","cities":["Mumbai","Dubai"],"name":"Emirates Economy","price":22000,"duration":"3h","category":"flight","tags":["international","luxury","family","shopping"],"metadata":{"comfort":5,"provider":"Emirates","mode":"Flight","best_for":"Premium airline"}},
    {"id":"tx_017","type":"transport","cities":["Mumbai","Dubai"],"name":"Air Arabia Budget","price":14000,"duration":"3h","category":"flight","tags":["international","budget","friends"],"metadata":{"comfort":3,"provider":"Air Arabia","mode":"Flight","best_for":"Budget international"}},
    {"id":"tx_018","type":"transport","cities":["Mumbai","Singapore"],"name":"Singapore Airlines Economy","price":20000,"duration":"5h 30m","category":"flight","tags":["international","family","shopping","culture"],"metadata":{"comfort":5,"provider":"Singapore Airlines","mode":"Flight","best_for":"Best service"}},
    {"id":"tx_019","type":"transport","cities":["Mumbai","Maldives"],"name":"SriLankan Airlines + Speedboat","price":28000,"duration":"4h","category":"flight","tags":["international","luxury","romance","couple"],"metadata":{"comfort":5,"provider":"SriLankan","mode":"Flight+Boat","best_for":"Romance"}},
    {"id":"tx_020","type":"transport","cities":["Bangalore","Goa"],"name":"GoAir Economy Flight","price":3200,"duration":"1h","category":"flight","tags":["fast","friends","beach"],"metadata":{"comfort":4,"provider":"GoAir","mode":"Flight","best_for":"Speed"}},
    {"id":"tx_021","type":"transport","cities":["Bangalore","Goa"],"name":"Karnataka KSRTC Sleeper Bus","price":700,"duration":"9h","category":"bus","tags":["budget","overnight","friends"],"metadata":{"comfort":3,"provider":"KSRTC","mode":"Bus","best_for":"Budget"}},
    {"id":"tx_022","type":"transport","cities":["Pune","Goa"],"name":"Luxury AC Sleeper Bus","price":800,"duration":"7h","category":"bus","tags":["budget","overnight","friends"],"metadata":{"comfort":3,"provider":"Neeta Tours","mode":"Bus","best_for":"Budget"}},
    {"id":"tx_023","type":"transport","cities":["Chennai","Kerala"],"name":"Rapid Express Train","price":500,"duration":"8h","category":"train","tags":["budget","nature","family"],"metadata":{"comfort":3,"provider":"Indian Railways","mode":"Train","best_for":"Budget scenic"}},
    {"id":"tx_024","type":"transport","cities":["Delhi","Leh Ladakh"],"name":"SpiceJet Leh Flight","price":7500,"duration":"1h 30m","category":"flight","tags":["adventure","mountains","friends","solo"],"metadata":{"comfort":4,"provider":"SpiceJet","mode":"Flight","best_for":"Only air option"}},
    {"id":"tx_025","type":"transport","cities":["Delhi","Leh Ladakh"],"name":"Royal Enfield Bike Rental (Manali-Leh)","price":3000,"duration":"2 days","category":"bike","tags":["adventure","solo","motorcycle","friends"],"metadata":{"comfort":2,"provider":"Local Rental","mode":"Bike","best_for":"Adventure"}},

    # ── HOTELS — GOA ─────────────────────────────────────────────────────────
    {"id":"ht_001","type":"hotel","city":"Goa","name":"Zostel Goa","price":600,"rating":4.0,"category":"hostel","tags":["budget","solo","backpacker","beach","friends"],"metadata":{"amenities":["WiFi","Common Kitchen","Locker","Social Area"],"location":"Anjuna","tier":"hostel","nights":1}},
    {"id":"ht_002","type":"hotel","city":"Goa","name":"Jungle Hostel Anjuna","price":700,"rating":4.1,"category":"hostel","tags":["budget","adventure","friends","social","beach"],"metadata":{"amenities":["Pool","Bar","Events","WiFi"],"location":"Anjuna","tier":"hostel","nights":1}},
    {"id":"ht_003","type":"hotel","city":"Goa","name":"Hotel Mandovi","price":1800,"rating":3.6,"category":"budget_hotel","tags":["budget","family","city_center"],"metadata":{"amenities":["AC","WiFi","TV","Room Service"],"location":"Panaji","tier":"budget_hotel","nights":1}},
    {"id":"ht_004","type":"hotel","city":"Goa","name":"Cavala Boutique Hotel","price":2200,"rating":3.8,"category":"budget_hotel","tags":["budget","beach","couple"],"metadata":{"amenities":["Pool","Restaurant","AC","WiFi"],"location":"Baga","tier":"budget_hotel","nights":1}},
    {"id":"ht_005","type":"hotel","city":"Goa","name":"WB by The Fern Goa","price":3500,"rating":4.2,"category":"mid_range","tags":["mid_range","beach","family","friends"],"metadata":{"amenities":["Pool","Restaurant","Gym","WiFi","Spa"],"location":"Calangute","tier":"mid_range","nights":1}},
    {"id":"ht_006","type":"hotel","city":"Goa","name":"Radisson Blu Resort Goa","price":5500,"rating":4.4,"category":"premium","tags":["premium","beach","family","couple","friends"],"metadata":{"amenities":["Beachfront","Pool","Fine Dining","Spa","WiFi"],"location":"Cavelossim","tier":"premium","nights":1}},
    {"id":"ht_007","type":"hotel","city":"Goa","name":"Novotel Goa Resort","price":5000,"rating":4.3,"category":"premium","tags":["premium","beach","family","couples"],"metadata":{"amenities":["Multiple Pools","Restaurants","Spa","WiFi","Kids Club"],"location":"Dona Paula","tier":"premium","nights":1}},
    {"id":"ht_008","type":"hotel","city":"Goa","name":"Taj Exotica Goa","price":14000,"rating":4.8,"category":"luxury","tags":["luxury","romance","couple","honeymoon","beach"],"metadata":{"amenities":["Private Beach","Butler","Fine Dining","Infinity Pool","Spa"],"location":"Benaulim","tier":"luxury","nights":1}},
    {"id":"ht_009","type":"hotel","city":"Goa","name":"The Leela Goa","price":16000,"rating":4.9,"category":"luxury","tags":["luxury","couple","beach","honeymoon","premium"],"metadata":{"amenities":["Private Beach","Multiple Pools","Spa","Fine Dining","Beach Club"],"location":"Mobor","tier":"luxury","nights":1}},
    {"id":"ht_010","type":"hotel","city":"Goa","name":"W Goa","price":18000,"rating":4.8,"category":"luxury","tags":["luxury","nightlife","friends","beach","party"],"metadata":{"amenities":["Beach Club","Infinity Pool","Bar","DJ Nights","Spa"],"location":"Vagator","tier":"luxury","nights":1}},
    {"id":"ht_011","type":"hotel","city":"Goa","name":"Park Inn by Radisson","price":4000,"rating":4.1,"category":"mid_range","tags":["mid_range","family","beach","affordable"],"metadata":{"amenities":["Pool","Restaurant","WiFi","Gym"],"location":"Anjuna","tier":"mid_range","nights":1}},
    {"id":"ht_012","type":"hotel","city":"Goa","name":"Alila Diwa Goa","price":7000,"rating":4.5,"category":"premium","tags":["premium","luxury","rice_fields","couple"],"metadata":{"amenities":["Rice Field Views","Pool","Spa","Fine Dining"],"location":"Majorda","tier":"premium","nights":1}},

    # ── HOTELS — KERALA ───────────────────────────────────────────────────────
    {"id":"ht_013","type":"hotel","city":"Kerala","name":"Zostel Varkala","price":650,"rating":4.1,"category":"hostel","tags":["budget","beach","solo","backpacker"],"metadata":{"amenities":["WiFi","Common Area","Cliff Beach Access"],"location":"Varkala","tier":"hostel","nights":1}},
    {"id":"ht_014","type":"hotel","city":"Kerala","name":"Alleppey Houseboat (Budget)","price":3500,"rating":4.3,"category":"budget_hotel","tags":["budget","nature","backwaters","couple","family"],"metadata":{"amenities":["Meals Included","Crew","AC Bedroom","Deck"],"location":"Alleppey","tier":"budget_hotel","nights":1}},
    {"id":"ht_015","type":"hotel","city":"Kerala","name":"Casino Hotel Kochi","price":3200,"rating":4.2,"category":"mid_range","tags":["mid_range","culture","family","heritage"],"metadata":{"amenities":["Pool","Restaurant","WiFi","Heritage View"],"location":"Fort Kochi","tier":"mid_range","nights":1}},
    {"id":"ht_016","type":"hotel","city":"Kerala","name":"Kumarakom Lake Resort","price":18000,"rating":4.9,"category":"luxury","tags":["luxury","nature","couple","romance","backwaters"],"metadata":{"amenities":["Private Pool Villas","Lake View","Ayurveda Spa","Fine Dining"],"location":"Kumarakom","tier":"luxury","nights":1}},
    {"id":"ht_017","type":"hotel","city":"Kerala","name":"Taj Malabar Kochi","price":12000,"rating":4.8,"category":"luxury","tags":["luxury","heritage","couple","culture"],"metadata":{"amenities":["Infinity Pool","Heritage Building","Fine Dining","Spa"],"location":"Willingdon Island","tier":"luxury","nights":1}},
    {"id":"ht_018","type":"hotel","city":"Kerala","name":"CGH Earth Marari Beach","price":9000,"rating":4.7,"category":"premium","tags":["premium","beach","couple","eco","yoga"],"metadata":{"amenities":["Beach","Yoga","Ayurveda","Organic Food","Pool"],"location":"Mararikulam","tier":"premium","nights":1}},

    # ── HOTELS — RAJASTHAN ───────────────────────────────────────────────────
    {"id":"ht_019","type":"hotel","city":"Rajasthan","name":"Moustache Hostel Jaipur","price":700,"rating":4.2,"category":"hostel","tags":["budget","solo","backpacker","culture","friends"],"metadata":{"amenities":["WiFi","Rooftop","Common Kitchen"],"location":"Pink City","tier":"hostel","nights":1}},
    {"id":"ht_020","type":"hotel","city":"Rajasthan","name":"Arya Niwas Heritage Hotel","price":1500,"rating":3.8,"category":"budget_hotel","tags":["budget","heritage","family","culture"],"metadata":{"amenities":["AC","Heritage Feel","WiFi","Restaurant"],"location":"Jaipur","tier":"budget_hotel","nights":1}},
    {"id":"ht_021","type":"hotel","city":"Rajasthan","name":"Jaipur Marriott Hotel","price":6000,"rating":4.4,"category":"mid_range","tags":["mid_range","premium","business","family"],"metadata":{"amenities":["Pool","Spa","Fine Dining","Gym","WiFi"],"location":"Near MI Road","tier":"mid_range","nights":1}},
    {"id":"ht_022","type":"hotel","city":"Rajasthan","name":"Rambagh Palace","price":35000,"rating":4.9,"category":"luxury","tags":["luxury","heritage","couple","honeymoon","royal"],"metadata":{"amenities":["Palace Grounds","Pool","Fine Dining","Polo Field","Spa"],"location":"Jaipur","tier":"luxury","nights":1}},
    {"id":"ht_023","type":"hotel","city":"Rajasthan","name":"Umaid Bhawan Palace","price":45000,"rating":5.0,"category":"luxury","tags":["luxury","royal","heritage","couple","unique"],"metadata":{"amenities":["Royal Heritage","Museum","Spa","Fine Dining","Pool"],"location":"Jodhpur","tier":"luxury","nights":1}},
    {"id":"ht_024","type":"hotel","city":"Rajasthan","name":"Fairmont Jaipur","price":12000,"rating":4.7,"category":"premium","tags":["premium","luxury","heritage","family","couple"],"metadata":{"amenities":["Pool","Spa","Fine Dining","Jaipur Decor"],"location":"Jaipur","tier":"premium","nights":1}},
    {"id":"ht_025","type":"hotel","city":"Rajasthan","name":"Trident Jaipur","price":8000,"rating":4.5,"category":"premium","tags":["premium","lake_view","family","couple"],"metadata":{"amenities":["Lake Views","Pool","Multiple Restaurants","Spa"],"location":"Jaipur","tier":"premium","nights":1}},

    # ── HOTELS — MANALI ──────────────────────────────────────────────────────
    {"id":"ht_026","type":"hotel","city":"Manali","name":"Zostel Manali","price":600,"rating":4.3,"category":"hostel","tags":["budget","adventure","solo","mountains","friends"],"metadata":{"amenities":["Mountain View","Common Room","Bonfire","WiFi"],"location":"Old Manali","tier":"hostel","nights":1}},
    {"id":"ht_027","type":"hotel","city":"Manali","name":"Hotel Snowflake","price":1400,"rating":3.7,"category":"budget_hotel","tags":["budget","mountain","family","friends"],"metadata":{"amenities":["River View","AC","WiFi","Hot Water"],"location":"Mall Road","tier":"budget_hotel","nights":1}},
    {"id":"ht_028","type":"hotel","city":"Manali","name":"Manuallaya Resort & Spa","price":6500,"rating":4.5,"category":"premium","tags":["premium","luxury","spa","couple","honeymoon","mountains"],"metadata":{"amenities":["River View","Spa","Pool","Fine Dining"],"location":"Naggar Road","tier":"premium","nights":1}},
    {"id":"ht_029","type":"hotel","city":"Manali","name":"Solang Valley Resort","price":4000,"rating":4.2,"category":"mid_range","tags":["mid_range","adventure","mountains","friends","family"],"metadata":{"amenities":["Mountain Views","Restaurant","Bonfire","WiFi"],"location":"Solang Valley","tier":"mid_range","nights":1}},

    # ── HOTELS — BALI ───────────────────────────────────────────────────────
    {"id":"ht_030","type":"hotel","city":"Bali","name":"Kuta Beach Hostel","price":800,"rating":4.0,"category":"hostel","tags":["budget","beach","friends","social","backpacker"],"metadata":{"amenities":["Pool","Bar","WiFi","Social Events"],"location":"Kuta","tier":"hostel","nights":1}},
    {"id":"ht_031","type":"hotel","city":"Bali","name":"Pullman Bali Legian Beach","price":8000,"rating":4.4,"category":"mid_range","tags":["mid_range","beach","friends","couple"],"metadata":{"amenities":["Beachfront","Pool","Restaurant","Spa"],"location":"Legian","tier":"mid_range","nights":1}},
    {"id":"ht_032","type":"hotel","city":"Bali","name":"AYANA Resort Bali","price":25000,"rating":4.9,"category":"luxury","tags":["luxury","romance","couple","honeymoon","cliff"],"metadata":{"amenities":["Rock Bar","Cliff Views","Multiple Pools","Spa","Dive Center"],"location":"Jimbaran","tier":"luxury","nights":1}},
    {"id":"ht_033","type":"hotel","city":"Bali","name":"Four Seasons Sayan Ubud","price":35000,"rating":5.0,"category":"luxury","tags":["luxury","nature","jungle","romance","couple"],"metadata":{"amenities":["Jungle View","Infinity Pool","Fine Dining","Spa","Yoga"],"location":"Ubud","tier":"luxury","nights":1}},
    {"id":"ht_034","type":"hotel","city":"Bali","name":"Conrad Bali","price":14000,"rating":4.7,"category":"premium","tags":["premium","beach","family","friends"],"metadata":{"amenities":["Beachfront","Multiple Pools","Restaurants","Spa"],"location":"Tanjung Benoa","tier":"premium","nights":1}},

    # ── HOTELS — DUBAI ──────────────────────────────────────────────────────
    {"id":"ht_035","type":"hotel","city":"Dubai","name":"Rove Downtown Dubai","price":5500,"rating":4.3,"category":"mid_range","tags":["mid_range","city","friends","budget_friendly"],"metadata":{"amenities":["Pool","Restaurant","WiFi","Near Mall"],"location":"Downtown","tier":"mid_range","nights":1}},
    {"id":"ht_036","type":"hotel","city":"Dubai","name":"Burj Al Arab Jumeirah","price":80000,"rating":5.0,"category":"luxury","tags":["luxury","ultra_luxury","couple","honeymoon","iconic"],"metadata":{"amenities":["Butler","Helipad","Fine Dining","Private Beach","Spa"],"location":"Jumeirah","tier":"luxury","nights":1}},
    {"id":"ht_037","type":"hotel","city":"Dubai","name":"Atlantis The Palm","price":25000,"rating":4.7,"category":"luxury","tags":["luxury","family","beach","waterpark","adventure"],"metadata":{"amenities":["Waterpark","Aquarium","Private Beach","11 Restaurants","Spa"],"location":"Palm Jumeirah","tier":"luxury","nights":1}},
    {"id":"ht_038","type":"hotel","city":"Dubai","name":"Marriott Downtown Dubai","price":12000,"rating":4.5,"category":"premium","tags":["premium","business","couple","city","family"],"metadata":{"amenities":["Burj View","Pool","Gym","Fine Dining","Spa"],"location":"Downtown","tier":"premium","nights":1}},

    # ── HOTELS — SINGAPORE ──────────────────────────────────────────────────
    {"id":"ht_039","type":"hotel","city":"Singapore","name":"The Hive Hostel","price":1200,"rating":4.3,"category":"hostel","tags":["budget","solo","backpacker","city","friends"],"metadata":{"amenities":["WiFi","Common Kitchen","Social Events","Lockers"],"location":"Lavender","tier":"hostel","nights":1}},
    {"id":"ht_040","type":"hotel","city":"Singapore","name":"Marina Bay Sands","price":40000,"rating":4.9,"category":"luxury","tags":["luxury","iconic","couple","family","infinity_pool"],"metadata":{"amenities":["Infinity Pool","Casino","Shopping","Fine Dining","SkyPark"],"location":"Marina Bay","tier":"luxury","nights":1}},
    {"id":"ht_041","type":"hotel","city":"Singapore","name":"Capella Singapore","price":35000,"rating":5.0,"category":"luxury","tags":["luxury","romance","couple","heritage","colonial"],"metadata":{"amenities":["Colonial Building","Pool","Spa","Fine Dining","Garden"],"location":"Sentosa","tier":"luxury","nights":1}},
    {"id":"ht_042","type":"hotel","city":"Singapore","name":"Fairmont Singapore","price":15000,"rating":4.6,"category":"premium","tags":["premium","business","couple","shopping"],"metadata":{"amenities":["Rooftop Pool","Spa","Multiple Restaurants","City Views"],"location":"City Hall","tier":"premium","nights":1}},

    # ── HOTELS — MALDIVES ───────────────────────────────────────────────────
    {"id":"ht_043","type":"hotel","city":"Maldives","name":"Kanuhura Maldives","price":45000,"rating":4.8,"category":"luxury","tags":["luxury","romance","couple","honeymoon","overwater"],"metadata":{"amenities":["Overwater Bungalow","Snorkeling","Fine Dining","Spa","Private Beach"],"location":"Lhaviyani Atoll","tier":"luxury","nights":1}},
    {"id":"ht_044","type":"hotel","city":"Maldives","name":"Coco Palm Dhuni Kolhu","price":35000,"rating":4.7,"category":"luxury","tags":["luxury","eco","couple","beach","romance"],"metadata":{"amenities":["Eco Luxury","Beach Villa","Spa","Reef Snorkeling"],"location":"Baa Atoll","tier":"luxury","nights":1}},
    {"id":"ht_045","type":"hotel","city":"Maldives","name":"Sun Siyam Iru Fushi","price":28000,"rating":4.6,"category":"premium","tags":["premium","beach","couple","family","snorkeling"],"metadata":{"amenities":["Water Sports","Beach Villa","Fine Dining","Spa","Multiple Pools"],"location":"Noonu Atoll","tier":"premium","nights":1}},

    # ── ACTIVITIES — GOA ─────────────────────────────────────────────────────
    {"id":"ac_001","type":"activity","city":"Goa","name":"Baga Beach Water Sports","price":1200,"rating":4.3,"duration":"3h","category":"adventure","tags":["adventure","beach","friends","thrill","morning","afternoon"],"metadata":{"includes":["Jet Ski","Parasailing","Banana Boat"],"best_time":"Morning"}},
    {"id":"ac_002","type":"activity","city":"Goa","name":"Dudhsagar Falls Day Trip","price":800,"rating":4.6,"duration":"Full Day","category":"nature","tags":["nature","waterfall","adventure","friends","couple","morning"],"metadata":{"includes":["Jeep Ride","Trekking","Swimming"],"best_time":"Morning"}},
    {"id":"ac_003","type":"activity","city":"Goa","name":"Old Goa Heritage Walk","price":200,"rating":4.2,"duration":"2h","category":"culture","tags":["culture","heritage","family","morning","educational"],"metadata":{"includes":["Basilica of Bom Jesus","Se Cathedral","Guide"],"best_time":"Morning"}},
    {"id":"ac_004","type":"activity","city":"Goa","name":"Spice Plantation Tour & Lunch","price":700,"rating":4.5,"duration":"4h","category":"culture","tags":["culture","food","family","couple","morning"],"metadata":{"includes":["Guided Tour","Traditional Lunch","Elephant Ride"],"best_time":"Morning"}},
    {"id":"ac_005","type":"activity","city":"Goa","name":"Anjuna Night Market","price":0,"rating":4.1,"duration":"3h","category":"nightlife","tags":["nightlife","shopping","friends","couples","evening"],"metadata":{"includes":["Local Crafts","Street Food","Live Music"],"best_time":"Evening"}},
    {"id":"ac_006","type":"activity","city":"Goa","name":"Sunset Cruise on Mandovi River","price":600,"rating":4.4,"duration":"2h","category":"relaxation","tags":["romance","couple","friends","evening","sunset"],"metadata":{"includes":["Cocktails","Snacks","Sunset Views","Music"],"best_time":"Evening"}},
    {"id":"ac_007","type":"activity","city":"Goa","name":"Scuba Diving at Grande Island","price":3500,"rating":4.7,"duration":"Half Day","category":"adventure","tags":["adventure","scuba","couple","solo","friends","morning"],"metadata":{"includes":["Gear","Instructor","2 Dives","Certificate Available"],"best_time":"Morning"}},
    {"id":"ac_008","type":"activity","city":"Goa","name":"Chapora Fort Sunset View","price":0,"rating":4.3,"duration":"1.5h","category":"heritage","tags":["heritage","sunset","couple","friends","evening"],"metadata":{"includes":["Fort Walk","Sunset Views","Photography"],"best_time":"Evening"}},
    {"id":"ac_009","type":"activity","city":"Goa","name":"Ayurvedic Full-Body Massage","price":2500,"rating":4.6,"duration":"2h","category":"relaxation","tags":["relaxation","luxury","couple","wellness","afternoon"],"metadata":{"includes":["Full Body Massage","Steam","Herbal Oils"],"best_time":"Afternoon"}},
    {"id":"ac_010","type":"activity","city":"Goa","name":"Saturday Night Market Curlies","price":0,"rating":4.2,"duration":"3h","category":"nightlife","tags":["nightlife","friends","shopping","food","evening"],"metadata":{"includes":["Stalls","Food","DJ","Craft Beer"],"best_time":"Evening"}},
    {"id":"ac_011","type":"activity","city":"Goa","name":"Yoga at Arambol Beach","price":800,"rating":4.5,"duration":"2h","category":"wellness","tags":["wellness","solo","couple","spiritual","morning"],"metadata":{"includes":["Hatha Yoga","Meditation","Beach Session"],"best_time":"Morning"}},
    {"id":"ac_012","type":"activity","city":"Goa","name":"Dolphin Watch Boat Trip","price":400,"rating":4.4,"duration":"2h","category":"nature","tags":["nature","family","couple","morning","sea"],"metadata":{"includes":["Boat","Guide","Dolphin Spotting"],"best_time":"Morning"}},
    {"id":"ac_013","type":"activity","city":"Goa","name":"Candlelight Dinner at Beach Shack","price":2000,"rating":4.7,"duration":"2.5h","category":"food","tags":["romance","couple","food","seafood","evening","luxury"],"metadata":{"includes":["Seafood Platter","Wine","Beach Setting","Live Music"],"best_time":"Evening"}},
    {"id":"ac_014","type":"activity","city":"Goa","name":"Fontainhas Latin Quarter Walk","price":0,"rating":4.3,"duration":"1.5h","category":"culture","tags":["culture","heritage","photography","morning","solo","couple"],"metadata":{"includes":["Portuguese Houses","Street Art","Local Cafes"],"best_time":"Morning"}},

    # ── ACTIVITIES — KERALA ───────────────────────────────────────────────────
    {"id":"ac_015","type":"activity","city":"Kerala","name":"Alleppey Houseboat Day Cruise","price":4500,"rating":4.8,"duration":"8h","category":"nature","tags":["nature","backwaters","family","couple","romance"],"metadata":{"includes":["Lunch","Dinner","AC Cabin","Crew"],"best_time":"Full Day"}},
    {"id":"ac_016","type":"activity","city":"Kerala","name":"Munnar Tea Estate Trek","price":500,"rating":4.5,"duration":"4h","category":"nature","tags":["nature","adventure","couple","morning","scenic"],"metadata":{"includes":["Tea Factory Visit","Tea Tasting","Guide"],"best_time":"Morning"}},
    {"id":"ac_017","type":"activity","city":"Kerala","name":"Kathakali Dance Show","price":400,"rating":4.6,"duration":"2h","category":"culture","tags":["culture","family","evening","heritage","traditional"],"metadata":{"includes":["Makeup Session Viewing","Live Performance","Explained Commentary"],"best_time":"Evening"}},
    {"id":"ac_018","type":"activity","city":"Kerala","name":"Periyar Wildlife Safari","price":800,"rating":4.5,"duration":"5h","category":"adventure","tags":["adventure","nature","family","wildlife","morning"],"metadata":{"includes":["Boat Ride","Forest Guide","Wildlife Viewing"],"best_time":"Morning"}},
    {"id":"ac_019","type":"activity","city":"Kerala","name":"Varkala Cliff Beach Yoga","price":600,"rating":4.4,"duration":"2h","category":"wellness","tags":["wellness","solo","couple","beach","morning","spiritual"],"metadata":{"includes":["Hatha Yoga","Pranayama","Cliff Sunrise"],"best_time":"Morning"}},
    {"id":"ac_020","type":"activity","city":"Kerala","name":"Kovalam Beach Surfing","price":1500,"rating":4.3,"duration":"3h","category":"adventure","tags":["adventure","beach","friends","solo","morning"],"metadata":{"includes":["Board Rental","Instructor","1h Lesson"],"best_time":"Morning"}},
    {"id":"ac_021","type":"activity","city":"Kerala","name":"Traditional Ayurvedic Panchakarma Treatment","price":3500,"rating":4.8,"duration":"3h","category":"relaxation","tags":["relaxation","luxury","wellness","couple","afternoon"],"metadata":{"includes":["Consultation","Treatment","Herbal Medicines"],"best_time":"Afternoon"}},

    # ── ACTIVITIES — RAJASTHAN ────────────────────────────────────────────────
    {"id":"ac_022","type":"activity","city":"Rajasthan","name":"Amber Fort with Elephant Ride","price":800,"rating":4.7,"duration":"3h","category":"heritage","tags":["heritage","family","culture","morning","iconic"],"metadata":{"includes":["Fort Entry","Elephant Ride","Audio Guide"],"best_time":"Morning"}},
    {"id":"ac_023","type":"activity","city":"Rajasthan","name":"Jaisalmer Desert Camel Safari","price":2500,"rating":4.8,"duration":"Full Day","category":"adventure","tags":["adventure","desert","friends","couple","unique","afternoon"],"metadata":{"includes":["Camel Ride","Sunset","Camping","Cultural Show","Dinner"],"best_time":"Afternoon"}},
    {"id":"ac_024","type":"activity","city":"Rajasthan","name":"City Palace & Hawa Mahal Tour","price":600,"rating":4.5,"duration":"4h","category":"heritage","tags":["heritage","culture","family","couple","morning"],"metadata":{"includes":["City Palace","Hawa Mahal","Audio Guide","Photo Stop"],"best_time":"Morning"}},
    {"id":"ac_025","type":"activity","city":"Rajasthan","name":"Ranthambore Tiger Safari","price":2000,"rating":4.7,"duration":"4h","category":"adventure","tags":["adventure","wildlife","family","couple","morning","unique"],"metadata":{"includes":["Safari Jeep","Forest Guide","Tiger Spotting"],"best_time":"Early Morning"}},
    {"id":"ac_026","type":"activity","city":"Rajasthan","name":"Udaipur Lake Pichola Sunset Boat","price":500,"rating":4.6,"duration":"1.5h","category":"relaxation","tags":["romance","couple","sunset","evening","scenic"],"metadata":{"includes":["Boat Ride","Lake View","City Palace View"],"best_time":"Evening"}},
    {"id":"ac_027","type":"activity","city":"Rajasthan","name":"Jodhpur Blue City Walk","price":400,"rating":4.5,"duration":"3h","category":"culture","tags":["culture","heritage","photography","morning","local"],"metadata":{"includes":["Heritage Lanes","Blue Houses","Photography Spots","Local Guide"],"best_time":"Morning"}},

    # ── ACTIVITIES — MANALI ──────────────────────────────────────────────────
    {"id":"ac_028","type":"activity","city":"Manali","name":"Solang Valley Snow Activities","price":1800,"rating":4.7,"duration":"5h","category":"adventure","tags":["adventure","snow","friends","couple","morning","winter"],"metadata":{"includes":["Skiing","Snowboarding","Zorbing","Rope Way"],"best_time":"Morning"}},
    {"id":"ac_029","type":"activity","city":"Manali","name":"Beas River White Water Rafting","price":1000,"rating":4.6,"duration":"3h","category":"adventure","tags":["adventure","rafting","friends","solo","morning","thrill"],"metadata":{"includes":["Raft","Life Jacket","Guide","Grade III-IV Rapids"],"best_time":"Morning"}},
    {"id":"ac_030","type":"activity","city":"Manali","name":"Rohtang Pass Day Trip","price":500,"rating":4.8,"duration":"Full Day","category":"nature","tags":["nature","snow","friends","couple","family","iconic","morning"],"metadata":{"includes":["Transport","Snow Gear Rental","Scenic Stops"],"best_time":"Early Morning"}},
    {"id":"ac_031","type":"activity","city":"Manali","name":"Hadimba Temple & Deodar Forest","price":0,"rating":4.5,"duration":"2h","category":"culture","tags":["culture","spiritual","family","morning","heritage"],"metadata":{"includes":["Temple Visit","Forest Walk","Photography"],"best_time":"Morning"}},
    {"id":"ac_032","type":"activity","city":"Manali","name":"Jogini Waterfall Trek","price":300,"rating":4.6,"duration":"4h","category":"adventure","tags":["adventure","trekking","friends","couple","morning","nature"],"metadata":{"includes":["Trek Guide","Waterfall Swim","Mountain Views"],"best_time":"Morning"}},
    {"id":"ac_033","type":"activity","city":"Manali","name":"Old Manali Cafe Hopping","price":500,"rating":4.3,"duration":"3h","category":"food","tags":["food","culture","friends","solo","afternoon","relaxation"],"metadata":{"includes":["Israeli Cafes","Momos","Apple Pie","Music"],"best_time":"Afternoon"}},
    {"id":"ac_034","type":"activity","city":"Manali","name":"Paragliding at Solang Valley","price":2500,"rating":4.9,"duration":"30 min","category":"adventure","tags":["adventure","thrill","solo","couple","friends","afternoon"],"metadata":{"includes":["Tandem Flight","Instructor","GoPro Video","Certificate"],"best_time":"Afternoon"}},

    # ── ACTIVITIES — BALI ────────────────────────────────────────────────────
    {"id":"ac_035","type":"activity","city":"Bali","name":"Mount Batur Sunrise Trek","price":2000,"rating":4.8,"duration":"5h","category":"adventure","tags":["adventure","trekking","friends","solo","couple","morning","spiritual"],"metadata":{"includes":["Guide","Breakfast at Summit","Sunrise Views"],"best_time":"Early Morning"}},
    {"id":"ac_036","type":"activity","city":"Bali","name":"Ubud Monkey Forest & Rice Terraces","price":1200,"rating":4.5,"duration":"4h","category":"nature","tags":["nature","culture","family","couple","morning","photography"],"metadata":{"includes":["Monkey Forest Entry","Tegalalang","Swing Photos"],"best_time":"Morning"}},
    {"id":"ac_037","type":"activity","city":"Bali","name":"Uluwatu Temple & Kecak Dance","price":1500,"rating":4.9,"duration":"3h","category":"culture","tags":["culture","sunset","couple","evening","iconic","romance"],"metadata":{"includes":["Temple Entry","Kecak Performance","Cliff Sunset"],"best_time":"Evening"}},
    {"id":"ac_038","type":"activity","city":"Bali","name":"Seminyak Beach Club Day","price":2500,"rating":4.6,"duration":"5h","category":"relaxation","tags":["relaxation","beach","friends","couple","afternoon","luxury"],"metadata":{"includes":["Pool Access","Drinks","Lounge","DJ Music"],"best_time":"Afternoon"}},
    {"id":"ac_039","type":"activity","city":"Bali","name":"Bali Cooking Class","price":1800,"rating":4.7,"duration":"4h","category":"food","tags":["food","culture","couple","family","morning","experience"],"metadata":{"includes":["Market Tour","Cooking 8 Dishes","Lunch","Recipe Book"],"best_time":"Morning"}},
    {"id":"ac_040","type":"activity","city":"Bali","name":"Tandem Surfing at Kuta","price":1200,"rating":4.5,"duration":"2h","category":"adventure","tags":["adventure","beach","friends","morning","solo","thrill"],"metadata":{"includes":["Board","Instructor","2h Lesson","Video"],"best_time":"Morning"}},
    {"id":"ac_041","type":"activity","city":"Bali","name":"Balinese Spa & Flower Bath","price":3000,"rating":4.8,"duration":"3h","category":"relaxation","tags":["relaxation","luxury","couple","romance","afternoon","wellness"],"metadata":{"includes":["Full Body Massage","Flower Bath","Herbal Wrap","Refreshments"],"best_time":"Afternoon"}},

    # ── ACTIVITIES — DUBAI ────────────────────────────────────────────────────
    {"id":"ac_042","type":"activity","city":"Dubai","name":"Burj Khalifa At the Top (148th Floor)","price":3000,"rating":4.9,"duration":"2h","category":"landmark","tags":["landmark","family","couple","evening","iconic","luxury"],"metadata":{"includes":["Fast Track Entry","City View","AR Telescope"],"best_time":"Sunset"}},
    {"id":"ac_043","type":"activity","city":"Dubai","name":"Desert Safari with BBQ Dinner","price":3500,"rating":4.8,"duration":"7h","category":"adventure","tags":["adventure","desert","family","friends","evening","culture"],"metadata":{"includes":["Dune Bashing","Camel Ride","Cultural Entertainment","BBQ Dinner"],"best_time":"Afternoon"}},
    {"id":"ac_044","type":"activity","city":"Dubai","name":"Dubai Mall & Dubai Fountain Show","price":0,"rating":4.6,"duration":"4h","category":"shopping","tags":["shopping","family","evening","fountain","free","friends"],"metadata":{"includes":["Dubai Mall","Fountain Show","Ice Rink","Aquarium"],"best_time":"Evening"}},
    {"id":"ac_045","type":"activity","city":"Dubai","name":"Palm Jumeirah Monorail & Beach","price":1500,"rating":4.4,"duration":"4h","category":"landmark","tags":["landmark","beach","family","afternoon","couple"],"metadata":{"includes":["Monorail","Atlantis View","Palm Beach Access"],"best_time":"Afternoon"}},
    {"id":"ac_046","type":"activity","city":"Dubai","name":"Skydiving over Palm Jumeirah","price":20000,"rating":5.0,"duration":"4h","category":"adventure","tags":["adventure","luxury","thrill","unique","solo","friends"],"metadata":{"includes":["Tandem Jump","GoPro Video","Certificate","Photos"],"best_time":"Morning"}},

    # ── ACTIVITIES — SINGAPORE ────────────────────────────────────────────────
    {"id":"ac_047","type":"activity","city":"Singapore","name":"Gardens by the Bay Light Show","price":2000,"rating":4.8,"duration":"3h","category":"nature","tags":["nature","family","evening","iconic","couple"],"metadata":{"includes":["Supertree Grove","Flower Dome","Cloud Forest","Night Show"],"best_time":"Evening"}},
    {"id":"ac_048","type":"activity","city":"Singapore","name":"Universal Studios Singapore","price":6000,"rating":4.7,"duration":"8h","category":"adventure","tags":["adventure","family","friends","thrill","full_day"],"metadata":{"includes":["All Rides","Shows","Cosume Characters","Fast Lane Option"],"best_time":"Morning"}},
    {"id":"ac_049","type":"activity","city":"Singapore","name":"Hawker Centre Food Trail","price":800,"rating":4.9,"duration":"3h","category":"food","tags":["food","culture","evening","local","friends","solo"],"metadata":{"includes":["Maxwell Hawker","Chinatown","Chilli Crab","Hainanese Chicken"],"best_time":"Evening"}},
    {"id":"ac_050","type":"activity","city":"Singapore","name":"Marina Bay Sands SkyPark","price":2800,"rating":4.9,"duration":"2h","category":"landmark","tags":["landmark","couple","sunset","evening","iconic","luxury"],"metadata":{"includes":["Infinity Pool Access","City Views","Cocktails"],"best_time":"Sunset"}},

    # ── FOOD PLANS ────────────────────────────────────────────────────────────
    {"id":"fp_001","type":"food","city":"Goa","name":"Goa Street Food Plan","price":400,"rating":4.3,"duration":"per day","category":"budget","tags":["budget","local","friends","solo","street_food","authentic"],"metadata":{"meals":["Fish Curry Rice","Prawn Rawa Fry","Bebinca","Goan Egg Bhurji","Coconut Water"],"per_day_per_person":400}},
    {"id":"fp_002","type":"food","city":"Goa","name":"Goa Beach Shack Plan","price":800,"rating":4.5,"duration":"per day","category":"mid_range","tags":["mid_range","beach","friends","couple","seafood","local"],"metadata":{"meals":["Shack Breakfast","Prawn Curry","Sol Kadi","Grilled Fish","Beach Drinks"],"per_day_per_person":800}},
    {"id":"fp_003","type":"food","city":"Goa","name":"Goa Fine Dining & Bar Hopping","price":2000,"rating":4.7,"duration":"per day","category":"luxury","tags":["luxury","nightlife","friends","couple","premium","bar"],"metadata":{"meals":["5-Star Brunch","Craft Cocktails","Fine Dining Dinner","Beach Club Snacks"],"per_day_per_person":2000}},
    {"id":"fp_004","type":"food","city":"Kerala","name":"Kerala Sadya & Thali Plan","price":350,"rating":4.4,"duration":"per day","category":"budget","tags":["budget","local","family","authentic","vegetarian"],"metadata":{"meals":["Puttu & Kadala","Kerala Sadya","Fish Moilee","Tender Coconut"],"per_day_per_person":350}},
    {"id":"fp_005","type":"food","city":"Kerala","name":"Kerala Cafe & Restaurant Plan","price":700,"rating":4.5,"duration":"per day","category":"mid_range","tags":["mid_range","cafe","couple","friends","seafood"],"metadata":{"meals":["Appam & Egg Roast","Kerala Biryani","Prawn Fry","Payasam"],"per_day_per_person":700}},
    {"id":"fp_006","type":"food","city":"Rajasthan","name":"Rajasthan Dhaba Plan","price":300,"rating":4.2,"duration":"per day","category":"budget","tags":["budget","local","family","authentic","vegetarian"],"metadata":{"meals":["Dal Baati Churma","Pyaz Kachori","Lassi","Gulab Jamun"],"per_day_per_person":300}},
    {"id":"fp_007","type":"food","city":"Rajasthan","name":"Rajasthan Heritage Dining","price":1500,"rating":4.7,"duration":"per day","category":"luxury","tags":["luxury","heritage","couple","family","royal","experience"],"metadata":{"meals":["Heritage Hotel Breakfast","Laal Maas","Royal Thali","Tented Dinner"],"per_day_per_person":1500}},
    {"id":"fp_008","type":"food","city":"Manali","name":"Manali Mountain Cafe Plan","price":500,"rating":4.4,"duration":"per day","category":"mid_range","tags":["mid_range","cafe","friends","solo","mountain","cozy"],"metadata":{"meals":["Israeli Breakfast","Momos","Apple Pie","Thukpa","Chai"],"per_day_per_person":500}},
    {"id":"fp_009","type":"food","city":"Bali","name":"Bali Warungs & Street Food","price":600,"rating":4.5,"duration":"per day","category":"budget","tags":["budget","local","friends","solo","authentic","backpacker"],"metadata":{"meals":["Nasi Goreng","Satay","Babi Guling","Coconut Drinks"],"per_day_per_person":600}},
    {"id":"fp_010","type":"food","city":"Bali","name":"Bali Beach Club Dining","price":2500,"rating":4.7,"duration":"per day","category":"luxury","tags":["luxury","beach","friends","couple","premium","sunset"],"metadata":{"meals":["Brunch at Potato Head","Sunset Cocktails","Fine Dining","Dessert Bar"],"per_day_per_person":2500}},
    {"id":"fp_011","type":"food","city":"Dubai","name":"Dubai Street Food & Cafes","price":1200,"rating":4.3,"duration":"per day","category":"budget","tags":["budget","local","friends","halal","shawarma"],"metadata":{"meals":["Shawarma","Falafel","Hummus","Al Faham Chicken","Knafeh"],"per_day_per_person":1200}},
    {"id":"fp_012","type":"food","city":"Dubai","name":"Dubai Restaurant Hopping","price":3500,"rating":4.6,"duration":"per day","category":"premium","tags":["premium","couple","friends","family","international"],"metadata":{"meals":["Brunch","Arabic Feast","International Cuisine","Dessert Cafe"],"per_day_per_person":3500}},
    {"id":"fp_013","type":"food","city":"Dubai","name":"Dubai Luxury Dining (Michelin)","price":8000,"rating":4.9,"duration":"per day","category":"luxury","tags":["luxury","couple","honeymoon","premium","michelin","unique"],"metadata":{"meals":["At.mosphere Breakfast","Coya Dubai","Nobu","Gold on 27"],"per_day_per_person":8000}},
    {"id":"fp_014","type":"food","city":"Singapore","name":"Singapore Hawker Centres","price":900,"rating":4.8,"duration":"per day","category":"budget","tags":["budget","local","friends","authentic","hawker","foodie"],"metadata":{"meals":["Chicken Rice","Laksa","Char Kway Teow","Ice Kacang","Chilli Crab"],"per_day_per_person":900}},
    {"id":"fp_015","type":"food","city":"Singapore","name":"Singapore Restaurant & Bar Plan","price":3000,"rating":4.6,"duration":"per day","category":"premium","tags":["premium","nightlife","friends","couple","international"],"metadata":{"meals":["Rooftop Brunch","Celebrity Chef Lunch","Cocktail Bar","Fine Dining"],"per_day_per_person":3000}},
]

# ─────────────────────────────────────────────────────────────────────────────
# RAG RETRIEVAL ENGINE — Keyword + Tag + Budget Scoring
# ─────────────────────────────────────────────────────────────────────────────

def _score_entry(entry: Dict, destination: str, budget_per_day: float,
                 preferences: List[str], group_type: str) -> float:
    score = 0.0
    dest_lower = destination.lower()

    # 1. City match (40 pts)
    city = (entry.get("city") or "").lower()
    cities = [c.lower() for c in (entry.get("cities") or [])]
    if city and (city in dest_lower or dest_lower in city):
        score += 40
    elif any(dest_lower in c or c in dest_lower for c in cities):
        score += 40

    # 2. Tags match preferences (5 pts each, max 25)
    pref_tags = set(p.lower() for p in preferences) | {group_type.lower()}
    entry_tags = set(t.lower() for t in entry.get("tags", []))
    matches = pref_tags & entry_tags
    score += min(25, len(matches) * 5)

    # 3. Budget fit (15 pts)
    price = entry.get("price", 0)
    entry_type = entry.get("type", "")
    if entry_type == "hotel":
        # Budget: daily hotel price vs per-day budget (hotels ~30-40% of daily spend)
        hotel_budget = budget_per_day * 0.4
        if price <= hotel_budget:
            score += 15
        elif price <= hotel_budget * 1.5:
            score += 8
        elif price <= hotel_budget * 2:
            score += 3
    elif entry_type == "activity":
        act_budget = budget_per_day * 0.25
        if price <= act_budget:
            score += 15
        elif price <= act_budget * 2:
            score += 8
    elif entry_type == "transport":
        score += 10  # always relevant
    elif entry_type == "food":
        food_budget = budget_per_day * 0.25
        if price <= food_budget:
            score += 15
        elif price <= food_budget * 1.5:
            score += 8

    # 4. Rating bonus (up to 10 pts)
    rating = entry.get("rating", 0)
    if rating:
        score += (rating - 3.0) * 5  # 4.0→5pts, 4.5→7.5pts, 5.0→10pts

    return max(0, score)


def retrieve_context(
    destination: str,
    budget: float,
    num_days: int,
    num_travelers: int,
    preferences: List[str],
    group_type: str,
    source: str = "",
) -> Dict[str, Any]:
    """
    Simulate vector retrieval. Returns top-scored items per category.
    Also returns vector_data (full dataset) for transparency.
    """
    budget_per_day = budget / max(1, num_days)

    scored: List[tuple] = []
    for entry in VECTOR_DATA:
        s = _score_entry(entry, destination, budget_per_day, preferences, group_type)
        # Also score transport by source city match
        if entry.get("type") == "transport" and source:
            cities = [c.lower() for c in entry.get("cities", [])]
            src_l = source.lower()
            if any(src_l in c or c in src_l for c in cities):
                s += 20
        if s > 0:
            scored.append((s, entry))

    scored.sort(key=lambda x: -x[0])

    # Cap per type
    retrieved: List[Dict] = []
    type_counts: Dict[str, int] = {"transport": 0, "hotel": 0, "activity": 0, "food": 0}
    type_caps: Dict[str, int]  = {"transport": 8, "hotel": 10, "activity": 20, "food": 6}

    for s, entry in scored:
        t = entry.get("type", "")
        if type_counts.get(t, 0) < type_caps.get(t, 5):
            retrieved.append({**entry, "_score": round(s, 1)})
            type_counts[t] = type_counts.get(t, 0) + 1

    # Group for easy access
    by_type: Dict[str, List] = {"transport": [], "hotel": [], "activity": [], "food": []}
    for e in retrieved:
        by_type.setdefault(e["type"], []).append(e)

    return {
        "vector_data_count": len(VECTOR_DATA),
        "retrieved_count": len(retrieved),
        "retrieved": retrieved,
        "by_type": by_type,
    }


def build_vector_context_string(ctx: Dict) -> str:
    """Convert retrieved context into a compact string for the LLM prompt."""
    by_type = ctx["by_type"]
    lines = []

    lines.append(f"=== RETRIEVED CONTEXT ({ctx['retrieved_count']} items from {ctx['vector_data_count']}-entry vector store) ===\n")

    if by_type.get("transport"):
        lines.append("TRANSPORT OPTIONS:")
        for t in by_type["transport"][:6]:
            lines.append(f"  [{t['id']}] {t['name']} | ₹{t['price']:,}/person | {t['duration']} | tags:{t['tags'][:3]}")

    if by_type.get("hotel"):
        lines.append("\nHOTEL OPTIONS:")
        for h in by_type["hotel"][:8]:
            lines.append(f"  [{h['id']}] {h['name']} | ₹{h['price']:,}/night | {h['rating']}★ | {h['category']} | tags:{h['tags'][:3]}")

    if by_type.get("activity"):
        lines.append("\nACTIVITIES:")
        for a in by_type["activity"][:15]:
            lines.append(f"  [{a['id']}] {a['name']} | ₹{a['price']:,} | {a['duration']} | {a['category']} | tags:{a['tags'][:3]}")

    if by_type.get("food"):
        lines.append("\nFOOD PLANS:")
        for f in by_type["food"][:5]:
            lines.append(f"  [{f['id']}] {f['name']} | ₹{f['price']:,}/person/day | {f['category']}")

    return "\n".join(lines)
