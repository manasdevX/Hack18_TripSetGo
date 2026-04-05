import os
import requests
from datetime import datetime
from langchain_core.tools import tool

@tool
def search_flights(origin: str, destination: str, date: str) -> list:
    """Search for real flights on RapidAPI (Sky-Scrapper). Date must be YYYY-MM-DD."""
    api_key = os.getenv("RAPIDAPI_KEY")
    if not api_key or len(api_key) < 10:
        return []
        
    try:
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "sky-scrapper.p.rapidapi.com"
        }
        # Get SkyIds for Origin and Destination
        res_dest = requests.get("https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport", params={"query": destination}, headers=headers)
        if res_dest.status_code != 200:
            return []
        data_dest = res_dest.json().get("data", [])
        if not data_dest:
            return []
            
        dest_sky = data_dest[0].get("skyId")
        dest_entity = data_dest[0].get("navigation", {}).get("entityId")
        
        orig_sky = "JFK" # Default to JFK if not supplied correctly
        orig_entity = "27537542"
        if origin and origin != "Home":
            res_orig = requests.get("https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport", params={"query": origin}, headers=headers)
            if res_orig.status_code == 200 and res_orig.json().get("data"):
                orig_sky = res_orig.json()["data"][0].get("skyId")
                orig_entity = res_orig.json()["data"][0].get("navigation", {}).get("entityId")

        # Search Flights
        params = {
            "originSkyId": orig_sky,
            "destinationSkyId": dest_sky,
            "originEntityId": orig_entity,
            "destinationEntityId": dest_entity,
            "date": date,
            "cabinClass": "economy",
            "adults": 1
        }
        res_flight = requests.get("https://sky-scrapper.p.rapidapi.com/api/v2/flights/searchFlights", params=params, headers=headers)
        if res_flight.status_code != 200:
            return []
            
        flights_data = res_flight.json().get("data", {}).get("itineraries", [])
        if not flights_data:
            return []
            
        results = []
        for fl in flights_data[:5]: # top 5
            price = fl.get("price", {}).get("raw", 150)
            airline = fl.get("legs", [{}])[0].get("carriers", {}).get("marketing", [{}])[0].get("name", "Airline")
            departure = fl.get("legs", [{}])[0].get("departure", "08:00")
            arrival = fl.get("legs", [{}])[0].get("arrival", "11:00")
            results.append({"airline": airline, "price": price, "time": departure[-8:-3], "arrival": arrival[-8:-3], "class": "economy", "type": "flight"})
            
        # Top 3 cheapest
        sorted_flights = sorted(results, key=lambda x: x["price"])
        return sorted_flights[:3]
    except Exception as e:
        print(f"Flight API Error: {e}")
        return []

@tool
def search_trains(origin: str, destination: str, date: str) -> list:
    """Search for real train options using Indian Railways API."""
    api_key = os.getenv("RAPIDAPI_KEY")
    if not api_key or len(api_key) < 10:
        return []

    # IRCTC typically needs Station Codes (NDLS, BCT). Provide a brief mock map.
    station_map = {
        "Delhi": "NDLS", "Mumbai": "BCT", "Bangalore": "SBC", 
        "Chennai": "MAS", "Kolkata": "HWH", "Goa": "MAO", 
        "Pune": "PUNE", "Jaipur": "JP"
    }
    
    # Safe fallback if input is weird format
    origin_city = origin.split(",")[0].strip() if origin else "Delhi"
    dest_city = destination.split(",")[0].strip() if destination else "Mumbai"
    
    orig_code = station_map.get(origin_city, "NDLS")
    dest_code = station_map.get(dest_city, "BCT")

    try:
        url = "https://indian-railway-irctc.p.rapidapi.com/v2/trainsBetweenStations/"
        params = {"fromStationCode": orig_code, "toStationCode": dest_code}
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "indian-railway-irctc.p.rapidapi.com"
        }
        res = requests.get(url, params=params, headers=headers)
        if res.status_code != 200:
            return []
        
        results = []
        data = res.json().get("data", [])
        for t in data[:5]:
            # The API might provide min/max fares; if omitted use 0 to prevent crashes
            results.append({
                "train_name": t.get("trainName", "Express Train"),
                "price": t.get("maxFare", 0) / 80.0, # roughly convert to USD format
                "time": t.get("departureTime", "08:00"),
                "arrival": t.get("arrivalTime", "14:00"),
                "class": "Sleeper",
                "type": "train"
            })
            
        sorted_trains = sorted(results, key=lambda x: x["price"])
        return sorted_trains[:3]
    except Exception as e:
        print(f"Train API error: {e}")
        return []

@tool
def search_restaurants(destination: str) -> list:
    """Search for real restaurants and food using Foursquare API."""
    fsq_key = os.getenv("FOURSQUARE_API_KEY", "fsq35IJf3kM0IBEus3XMCfGdZ8cephoVPuht5QEW4l3V998=")
    
    try:
        url = "https://api.foursquare.com/v3/places/search"
        params = {
            "near": destination,
            "categories": "13065", # Restaurant ID
            "limit": 10,
            "sort": "POPULARITY"
        }
        headers = {"Authorization": fsq_key, "Accept": "application/json"}
        response = requests.get(url, params=params, headers=headers)
        
        if response.status_code != 200:
            raise Exception("API Limit/Auth")
            
        data = response.json()
        results = []
        for place in data.get("results", []):
            name = place.get("name")
            rating = place.get("rating", 7.0) / 2  # Foursquare is out of 10
            price_tier = place.get("price", 2)
            estimated_price = price_tier * 25 # $25 per tier
            
            if rating >= 3.5:
                results.append({"restaurant": name, "rating": rating, "price_per_meal": estimated_price})
                
        sorted_rest = sorted(results, key=lambda x: x["price_per_meal"])
        return sorted_rest[:3]
    except Exception as e:
        print(f"Food API Error: {e}")
        return []

@tool
def search_hotels(destination: str, checkin_date: str, nights: int) -> list:
    """Search for real accommodations and hotels in the destination."""
    fsq_key = os.getenv("FOURSQUARE_API_KEY", "fsq35IJf3kM0IBEus3XMCfGdZ8cephoVPuht5QEW4l3V998=")
    try:
        url = "https://api.foursquare.com/v3/places/search"
        params = {
            "near": destination,
            "categories": "19014", # Hotel ID
            "limit": 10,
            "sort": "POPULARITY"
        }
        headers = {"Authorization": fsq_key, "Accept": "application/json"}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code != 200:
            raise Exception("API Limit/Auth")
            
        data = response.json()
        results = []
        for place in data.get("results", []):
            name = place.get("name")
            rating = place.get("rating", 7.0) / 2
            price_tier = place.get("price", 2)
            estimated_price = price_tier * 60 
            
            if rating >= 3.0:
                results.append({"hotel": name, "price_per_night": estimated_price, "rating": rating})
                
        sorted_hotels = sorted(results, key=lambda x: x["price_per_night"])
        return sorted_hotels[:3]
    except Exception as e:
        print(f"Hotel API Error: {e}")
        return []

@tool
def search_local_attractions(destination: str, preferences: str) -> list:
    """Search for real top attractions and local activities in the destination."""
    fsq_key = os.getenv("FOURSQUARE_API_KEY", "fsq35IJf3kM0IBEus3XMCfGdZ8cephoVPuht5QEW4l3V998=")
    try:
        url = "https://api.foursquare.com/v3/places/search"
        params = {
            "near": destination,
            "categories": "16000,10000", # Landmarks and Arts/Entertainment
            "limit": 10,
            "sort": "POPULARITY"
        }
        headers = {"Authorization": fsq_key, "Accept": "application/json"}
        response = requests.get(url, params=params, headers=headers)
        if response.status_code != 200:
            raise Exception("API Limit/Auth")
        
        data = response.json()
        results = []
        for place in data.get("results", []):
            name = place.get("name")
            rating = place.get("rating", 8.0) / 2
            price = place.get("price", 1) * 15 # estimate entry fee
            if rating > 3.0:
                results.append({"attraction": name, "cost": price, "rating": rating})
        
        top_attractions = sorted(results, key=lambda x: x["rating"], reverse=True)
        return top_attractions[:3]
    except Exception as e:
        print(f"Attractions API Error: {e}")
        return []
