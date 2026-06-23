import api from './api';

export const travelApi = {
  // Flights
  searchAirports: (keyword, subType = 'AIRPORT,CITY') => 
    api.get(`/api/v1/flights/airports`, { params: { keyword, subType } }),
  searchFlights: (params) => 
    api.get(`/api/v1/flights/search`, { params }), // origin, destination, departureDate, adults, travelClass
  confirmFlightPricing: (offer) => 
    api.post(`/api/v1/flights/pricing`, { offer }),
  getAirlines: (codes) => 
    api.get(`/api/v1/flights/airlines`, { params: { codes } }),

  // Weather
  getCurrentWeather: (city, lat, lon) => 
    api.get(`/api/v1/weather/current`, { params: { city, lat, lon } }),
  getWeatherForecast: (city, lat, lon) => 
    api.get(`/api/v1/weather/forecast`, { params: { city, lat, lon } }),

  // Attractions
  searchAttractionsByCity: (city, limit = 20, radius = 10000, categories) => 
    api.get(`/api/v1/attractions/search/city`, { params: { city, limit, radius, categories } }),
  searchAttractionsNearby: (lat, lon, limit = 20, radius = 5000, categories) => 
    api.get(`/api/v1/attractions/search/nearby`, { params: { lat, lon, limit, radius, categories } }),
  getAttractionDetails: (xid) => 
    api.get(`/api/v1/attractions/${xid}`),

  // Restaurants
  searchRestaurantsByCity: (city, limit = 20, radius = 5000, cuisine, openNow, minPrice, maxPrice) => 
    api.get(`/api/v1/restaurants/search/city`, { params: { city, limit, radius, cuisine, openNow, minPrice, maxPrice } }),
  searchRestaurantsNearby: (lat, lon, limit = 20, radius = 2000, cuisine, openNow, minPrice, maxPrice) => 
    api.get(`/api/v1/restaurants/search/nearby`, { params: { lat, lon, limit, radius, cuisine, openNow, minPrice, maxPrice } }),
  getRestaurantDetails: (fsqId) => 
    api.get(`/api/v1/restaurants/${fsqId}`),
};
