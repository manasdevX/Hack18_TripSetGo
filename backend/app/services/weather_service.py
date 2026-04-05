import httpx
import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class WeatherService:
    """
    Fetches real-time and forecast weather data from OpenWeatherMap.
    """
    BASE_URL = "https://api.openweathermap.org/data/2.5"
    
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY

    def get_forecast_sync(self, city: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Synchronous version of get_forecast.
        """
        if not self.api_key or self.api_key == "your_weather_api_key":
            return self._get_fallback_weather(city, start_date, end_date)

        try:
            with httpx.Client(timeout=10.0) as client:
                # 1. Geographic lookup
                geo_resp = client.get(
                    f"http://api.openweathermap.org/geo/1.0/direct",
                    params={"q": city, "limit": 1, "appid": self.api_key}
                )
                geo_resp.raise_for_status()
                geo_data = geo_resp.json()
                
                if not geo_data:
                    return self._get_fallback_weather(city, start_date, end_date)
                
                lat = geo_data[0]["lat"]
                lon = geo_data[0]["lon"]

                # 2. Get 5-day forecast
                forecast_resp = client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "lat": lat,
                        "lon": lon,
                        "appid": self.api_key,
                        "units": "metric"
                    }
                )
                forecast_resp.raise_for_status()
                data = forecast_resp.json()

                return self._process_forecast(data, start_date, end_date)
        except Exception as e:
            logger.error(f"Weather API sync error for {city}: {str(e)}")
            return self._get_fallback_weather(city, start_date, end_date)

    async def get_forecast(self, city: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Get forecast for a range of dates.
        OpenWeather free tier only allows 5-day / 3-hour forecast.
        If the dates are further out, we return generalized seasonal data.
        """
        if not self.api_key or self.api_key == "your_weather_api_key":
            return self._get_fallback_weather(city, start_date, end_date)

        try:
            # 1. Geographic lookup (Geocoding API)
            async with httpx.AsyncClient(timeout=10.0) as client:
                geo_resp = await client.get(
                    f"http://api.openweathermap.org/geo/1.0/direct",
                    params={"q": city, "limit": 1, "appid": self.api_key}
                )
                geo_resp.raise_for_status()
                geo_data = geo_resp.json()
                
                if not geo_data:
                    return self._get_fallback_weather(city, start_date, end_date)
                
                lat = geo_data[0]["lat"]
                lon = geo_data[0]["lon"]

                # 2. Get 5-day / 3-hour forecast
                forecast_resp = await client.get(
                    f"{self.BASE_URL}/forecast",
                    params={
                        "lat": lat,
                        "lon": lon,
                        "appid": self.api_key,
                        "units": "metric" # Celsius
                    }
                )
                forecast_resp.raise_for_status()
                data = forecast_resp.json()

                # 3. Process data into day-wise summaries
                return self._process_forecast(data, start_date, end_date)

        except Exception as e:
            logger.error(f"Weather API error for {city}: {str(e)}")
            return self._get_fallback_weather(city, start_date, end_date)

    def _process_forecast(self, data: Dict, start_date: date, end_date: date) -> Dict:
        """
        Groups the 3-hour chunks into a single summary per day.
        """
        daily_forecast = {}
        
        for item in data.get("list", []):
            dt = datetime.fromtimestamp(item["dt"]).date()
            if start_date <= dt <= end_date:
                if dt not in daily_forecast:
                    daily_forecast[dt] = {
                        "temps": [],
                        "conditions": [],
                        "icons": []
                    }
                daily_forecast[dt]["temps"].append(item["main"]["temp"])
                daily_forecast[dt]["conditions"].append(item["weather"][0]["main"])
                daily_forecast[dt]["icons"].append(item["weather"][0]["icon"])

        result = {}
        for dt, stats in daily_forecast.items():
            # Get peak condition (most frequent)
            condition = max(set(stats["conditions"]), key=stats["conditions"].count)
            icon = max(set(stats["icons"]), key=stats["icons"].count)
            
            result[dt.isoformat()] = {
                "temp_min": round(min(stats["temps"])),
                "temp_max": round(max(stats["temps"])),
                "condition": condition,
                "icon": f"https://openweathermap.org/img/wn/{icon}@2x.png",
                "description": f"{condition} with a high of {round(max(stats['temps']))}°C"
            }
            
        return result

    def _get_fallback_weather(self, city: str, start_date: date, end_date: date) -> Dict:
        """
        Returns generalized seasonal weather based on the month.
        """
        # A simple fallback based on month
        month = start_date.month
        # Categorize by typical Indian season ifcity is likely Indian
        # (Very simplified)
        is_summer = 3 <= month <= 6
        is_monsoon = 7 <= month <= 9
        
        condition = "Sunny" if is_summer else ("Rainy" if is_monsoon else "Clear")
        icon = "01d" if is_summer else ("10d" if is_monsoon else "02d")
        avg_high = 32 if is_summer else (28 if is_monsoon else 24)
        avg_low = 24 if is_summer else (22 if is_monsoon else 12)

        result = {}
        current = start_date
        while current <= end_date:
            result[current.isoformat()] = {
                "temp_min": avg_low,
                "temp_max": avg_high,
                "condition": condition,
                "icon": f"https://openweathermap.org/img/wn/{icon}@2x.png",
                "description": f"Typical {condition} weather for this season."
            }
            current += timedelta(days=1)
            
        return result
