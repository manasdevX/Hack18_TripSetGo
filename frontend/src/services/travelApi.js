import { apiSlice } from '@/app/apiSlice'
import api from './api'

export const travelApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchAirports: builder.query({
      query: ({ keyword, limit = 10 } = {}) => ({
        url: '/api/v1/flights/airports',
        params: { keyword, limit },
      }),
    }),
    searchAirportsByCity: builder.query({
      query: ({ city, limit = 10 } = {}) => ({
        url: '/api/v1/flights/airports/city',
        params: { city, limit },
      }),
    }),
    searchFlights: builder.query({
      query: (params) => ({
        url: '/api/v1/flights/search',
        params,
      }),
    }),
    getFlightStatus: builder.query({
      query: ({ flightIata, flightDate } = {}) => ({
        url: '/api/v1/flights/status',
        params: { flightIata, flightDate },
      }),
    }),
    getAirlines: builder.query({
      query: ({ codes } = {}) => ({
        url: '/api/v1/flights/airlines',
        params: { codes },
      }),
    }),
    getCurrentWeather: builder.query({
      query: ({ city, lat, lon } = {}) => ({
        url: '/api/v1/weather/current',
        params: { city, lat, lon },
      }),
    }),
    getWeatherForecast: builder.query({
      query: ({ city, lat, lon } = {}) => ({
        url: '/api/v1/weather/forecast',
        params: { city, lat, lon },
      }),
    }),
    searchAttractionsByCity: builder.query({
      query: ({ city, limit = 20, radius = 10000 } = {}) => ({
        url: '/api/v1/travel/attractions',
        params: { destination: city, limit, radius },
      }),
    }),
    searchAttractionsByCategory: builder.query({
      query: ({ city, category, limit = 20, radius = 12000 } = {}) => ({
        url: '/api/v1/attractions/category',
        params: { city, category, limit, radius },
      }),
    }),
    searchAttractionsNearby: builder.query({
      query: ({ lat, lon, limit = 20, radius = 5000, kinds } = {}) => ({
        url: '/api/v1/attractions/nearby',
        params: { lat, lon, limit, radius, kinds },
      }),
    }),
    getAttractionDetails: builder.query({
      query: (xid) => `/api/v1/attractions/${xid}`,
    }),
    searchRestaurantsByCity: builder.query({
      query: ({ city, limit = 20, radius = 5000, cuisine, openNow, minPrice, maxPrice } = {}) => ({
        url: '/api/v1/restaurants/city',
        params: { city, limit, radius, cuisine, openNow, minPrice, maxPrice },
      }),
    }),
    searchRestaurantsNearby: builder.query({
      query: ({ lat, lon, limit = 20, radius = 2000, cuisine, openNow, minPrice, maxPrice } = {}) => ({
        url: '/api/v1/restaurants/nearby',
        params: { lat, lon, limit, radius, cuisine, openNow, minPrice, maxPrice },
      }),
    }),
    getRestaurantDetails: builder.query({
      query: (fsqId) => `/api/v1/restaurants/${fsqId}`,
    }),
    searchHotelsByCity: builder.query({
      query: ({ city, limit = 20, radius = 5000 } = {}) => ({
        url: '/api/v1/hotels/search',
        params: { city, limit, radius },
      }),
    }),
    searchHotelsNearby: builder.query({
      query: ({ lat, lon, limit = 20, radius = 2000 } = {}) => ({
        url: '/api/v1/hotels/nearby',
        params: { lat, lon, limit, radius },
      }),
    }),
    getHotelDetails: builder.query({
      query: (fsqId) => `/api/v1/hotels/${fsqId}`,
    }),
  }),
})

export const {
  useSearchAirportsQuery,
  useSearchAirportsByCityQuery,
  useSearchFlightsQuery,
  useGetFlightStatusQuery,
  useGetAirlinesQuery,
  useGetCurrentWeatherQuery,
  useGetWeatherForecastQuery,
  useSearchAttractionsByCityQuery,
  useSearchAttractionsByCategoryQuery,
  useSearchAttractionsNearbyQuery,
  useGetAttractionDetailsQuery,
  useSearchRestaurantsByCityQuery,
  useSearchRestaurantsNearbyQuery,
  useGetRestaurantDetailsQuery,
  useSearchHotelsByCityQuery,
  useSearchHotelsNearbyQuery,
  useGetHotelDetailsQuery,
} = travelApiSlice

// Backward-compatible promise-based object helper for legacy code
export const travelApi = {
  searchAirports: (keyword, limit = 10) =>
    api.get(`/api/v1/flights/airports`, { params: { keyword, limit } }),
  searchAirportsByCity: (city, limit = 10) =>
    api.get(`/api/v1/flights/airports/city`, { params: { city, limit } }),
  searchFlights: (params) =>
    api.get(`/api/v1/flights/search`, { params }),
  getFlightStatus: (flightIata, flightDate) =>
    api.get(`/api/v1/flights/status`, { params: { flightIata, flightDate } }),
  getAirlines: (codes) =>
    api.get(`/api/v1/flights/airlines`, { params: { codes } }),

  getCurrentWeather: (city, lat, lon) =>
    api.get(`/api/v1/weather/current`, { params: { city, lat, lon } }),
  getWeatherForecast: (city, lat, lon) =>
    api.get(`/api/v1/weather/forecast`, { params: { city, lat, lon } }),

  searchAttractionsByCity: (city, limit = 20, radius = 10000) =>
    api.get(`/api/v1/travel/attractions`, { params: { destination: city, limit, radius } }),
  searchAttractionsByCategory: (city, category, limit = 20, radius = 12000) =>
    api.get(`/api/v1/attractions/category`, { params: { city, category, limit, radius } }),
  searchAttractionsNearby: (lat, lon, limit = 20, radius = 5000, kinds) =>
    api.get(`/api/v1/attractions/nearby`, { params: { lat, lon, limit, radius, kinds } }),
  getAttractionDetails: (xid) =>
    api.get(`/api/v1/attractions/${xid}`),

  searchRestaurantsByCity: (city, limit = 20, radius = 5000, cuisine, openNow, minPrice, maxPrice) =>
    api.get(`/api/v1/restaurants/city`, { params: { city, limit, radius, cuisine, openNow, minPrice, maxPrice } }),
  searchRestaurantsNearby: (lat, lon, limit = 20, radius = 2000, cuisine, openNow, minPrice, maxPrice) =>
    api.get(`/api/v1/restaurants/nearby`, { params: { lat, lon, limit, radius, cuisine, openNow, minPrice, maxPrice } }),
  getRestaurantDetails: (fsqId) =>
    api.get(`/api/v1/restaurants/${fsqId}`),

  searchHotelsByCity: (city, limit = 20, radius = 5000) =>
    api.get(`/api/v1/hotels/search`, { params: { city, limit, radius } }),
  searchHotelsNearby: (lat, lon, limit = 20, radius = 2000) =>
    api.get(`/api/v1/hotels/nearby`, { params: { lat, lon, limit, radius } }),
  getHotelDetails: (fsqId) =>
    api.get(`/api/v1/hotels/${fsqId}`),
}
