import { create } from "zustand";
import api from "../lib/api";

export const useTripStore = create((set, get) => ({
  // ── NEW: Saved trips CRUD ────────────────────────────────────────────────
  fetchMyTrips: async () => {
    set({ tripsLoaded: false });
    try {
      const res = await api.get("/trips/mine");
      set({ trips: res.data || [], tripsLoaded: true });
    } catch {
      set({ trips: [], tripsLoaded: true });
    }
  },

  fetchTripById: async (tripId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/trips/${tripId}`);
      set({ tripData: res.data, isLoading: false });
      return res.data;
    } catch (err) {
      set({
        isLoading: false,
        error: err?.response?.data?.detail || "Failed to load trip"
      });
      throw err;
    }
  },

  deleteTrip: async (tripId) => {
    try {
      await api.delete(`/trips/${tripId}`);
      set((s) => ({ trips: s.trips.filter((t) => t.id !== tripId) }));
    } catch (e) { throw e; }
  },

  duplicateTrip: async (tripId) => {
    const res = await api.post(`/trips/${tripId}/duplicate`);
    const newTrip = res.data?.trip;
    if (newTrip) set((s) => ({ trips: [newTrip, ...s.trips] }));
    return newTrip;
  },

  toggleFavTrip: async (tripId) => {
    const res = await api.patch(`/trips/${tripId}/favorite`);
    const { is_favorite } = res.data;
    set((s) => ({
      trips: s.trips.map((t) => t.id === tripId
        ? { ...t, is_favorite, tags: is_favorite ? [...(t.tags||[]),"favorite"] : (t.tags||[]).filter(x=>x!=="favorite") }
        : t
      )
    }));
    return is_favorite;
  },

  togglePublic: async (tripId) => {
    const res = await api.patch(`/trips/${tripId}/publish`);
    const { is_public } = res.data;
    set((s) => ({
      trips: s.trips.map((t) => t.id === tripId ? { ...t, is_public } : t)
    }));
    return is_public;
  },

  // ── Legacy state ──────────────────────────────────────────────────────────
  tripData: null,
  isLoading: false,
  error: null,
  trips: [],            // all trips list
  tripsLoaded: false,

  // Convert deterministic engine response into the shape Dashboard renders.
  _mapOrchestratorToDashboardTrip: (orchestratorResponse, searchParams) => {
    const status = orchestratorResponse?.status;
    const data = orchestratorResponse?.data;

    if (!data || status === "error") return null;

    const destinationContext = data.destination_context || {};
    const transport0 = (data.transport && data.transport[0]) ? data.transport[0] : null;

    const weatherSummary = destinationContext.weather_summary || "";
    const tempMatch = weatherSummary.match(/(-?\d+)\s*°?\s*C/i);
    const tempC = tempMatch ? `${parseInt(tempMatch[1], 10)}°C` : null;

    const condition = weatherSummary
      ? weatherSummary.split(",")[0].trim().replace(/highs around\s*/i, "").trim()
      : "Sunny";

    const durationMinutes = transport0?.duration_minutes;
    const durationText =
      typeof durationMinutes === "number"
        ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
        : "—";

    const distanceText =
      transport0?.departure && transport0?.arrival
        ? `${transport0.departure} → ${transport0.arrival}`
        : "Estimated route";

    const itineraryDays = data.itinerary?.days || [];
    const itinerary = itineraryDays.map((d) => ({
      day: d.day,
      title: d.title || `Day ${d.day}`,
      activities: Array.isArray(d.activities) ? d.activities : [],
      transport_notes: d.transport_notes || null,
      meals: d.meals || null,
      date: d.date || null,
    }));

    const budgetSummary = data.budget_summary || {};
    const totalCost = budgetSummary.total_estimated_cost;
    const totalBudgetText =
      typeof totalCost === "number"
        ? `₹${Math.round(totalCost).toLocaleString()}`
        : searchParams?.budget
          ? `₹${Number(searchParams.budget).toLocaleString()}`
          : "—";

    return {
      destination: destinationContext.destination || searchParams.destination,
      source: searchParams.origin,
      status: status,
      weather: {
        temp: tempC || "—",
        condition: condition || "Sunny",
        advice: destinationContext.local_tips || "",
        advisories: destinationContext.travel_advisories || [],
        areas: destinationContext.areas || [],
        best_areas: destinationContext.best_areas_to_stay || [],
      },
      budget: {
        total: totalBudgetText,
        total_raw: totalCost,
        user_budget: searchParams?.budget ? Number(searchParams.budget) : null,
        allocated_transport: budgetSummary.allocated_transport,
        allocated_stay: budgetSummary.allocated_stay,
        allocated_activities: budgetSummary.allocated_activities,
        estimated_transport: budgetSummary.estimated_transport_cost,
        estimated_stay: budgetSummary.estimated_stay_cost,
        remaining: budgetSummary.remaining_budget,
        within_budget: budgetSummary.within_budget,
        cost_per_person: budgetSummary.cost_per_person,
      },
      route: {
        distance: distanceText,
        duration: durationText,
        mode: transport0?.mode || "transport",
      },
      transport: (data.transport || []).map((t) => ({
        mode: t.mode,
        provider: t.provider,
        route_number: t.route_number,
        departure: t.departure,
        arrival: t.arrival,
        duration_minutes: t.duration_minutes,
        price: t.price,
        currency: t.currency || "INR",
        class_type: t.class_type,
        source_url: t.source_url,
      })),
      stay: (data.stay || []).map((s) => ({
        name: s.name,
        address: s.address,
        area: s.area,
        rating: s.rating,
        price_per_night: s.price_per_night,
        total_price: s.total_price,
        amenities: s.amenities || [],
        currency: s.currency || "INR",
        source_url: s.source_url,
      })),
      itinerary,
      itinerary_summary: data.itinerary?.summary || null,
      navigation: data.navigation || null,
    };
  },

  // Generate a new trip via Agentic planning engine
  generateTrip: async (searchParams) => {
    set({ isLoading: true, error: null, tripData: null });

    try {
      const budgetNum = Number(searchParams.budget) || 2000;
      const travelers = Number(searchParams.travelers || searchParams.travellers) || 1;
      const daysInfo = searchParams.startDate ? ` from ${searchParams.startDate} to ${searchParams.endDate}` : " for 3 days";
      
      const query = `Plan a trip to ${searchParams.destination}${daysInfo} for ${travelers} people with a $${budgetNum} budget.`;
      
      // Hit the new LangGraph API directly
      const response = await fetch("http://127.0.0.1:8000/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) throw new Error("Agentic API error");
      const data = await response.json();
      
      if (data.status !== "success") {
         throw new Error("Failed to plan trip gracefully under constraints.");
      }

      // Map our new Agentic LangGraph format into the Dashboard UI format
      const booked_flights = data.booked_flights || {};
      const booked_hotels = data.booked_hotels || {};
      const booked_food = data.booked_food || [];
      const activities = data.daily_itinerary || [];
      const totalCostRaw = parseFloat(data.total_cost) || 0;

      // Extract restaurant details safely
      const restaurant = booked_food.length > 0 ? booked_food[0] : null;

      const mapped = {
        destination: searchParams.destination || data.destination || "Destination",
        source: searchParams.source || "Origin",
        status: "success",
        weather: {
          temp: "—", // Strict logic: no weather API integration yet, so intentionally blank
          condition: "—",
          advice: `Enjoy your planned trip to ${data.destination}!`,
          advisories: [],
          areas: [],
          best_areas: []
        },
        budget: {
          total: `₹${(totalCostRaw * 80).toLocaleString()}`, // rough USD to INR for UI sake if UI uses INR
          total_raw: totalCostRaw * 80,
          user_budget: budgetNum * 80,
          remaining: (data.budget - totalCostRaw) * 80,
          within_budget: data.budget_adhered,
        },
        route: {
          distance: `${searchParams.source || 'Origin'} → ${data.destination || 'Destination'}`,
          duration: booked_flights.time ? `Departing: ${booked_flights.time}` : "—",
          mode: booked_flights.type || "flight"
        },
        transport: Object.keys(booked_flights).length ? [{
          mode: booked_flights.type || "flight",
          provider: booked_flights.airline || booked_flights.train_name || "Unknown Provider",
          departure: booked_flights.time || "TBD",
          arrival: booked_flights.arrival || "TBD",
          price: (booked_flights.price || 0) * 80,
          currency: "INR",
          class_type: booked_flights.class || "Economy"
        }] : [],
        stay: Object.keys(booked_hotels).length ? [{
          name: booked_hotels.hotel || "Unknown Hotel",
          rating: booked_hotels.rating || 4.0,
          price_per_night: (booked_hotels.price_per_night || 0) * 80,
          total_price: ((booked_hotels.price_per_night || 0) * 3) * 80,
          currency: "INR",
          area: data.destination
        }] : [],
        itinerary: [{
          day: 1,
          title: "Agentic Planned Excursion",
          meals: restaurant ? [`Dinner at ${restaurant.restaurant} (Rating: ${restaurant.rating}, ~US$${restaurant.price_per_meal})`] : [],
          activities: activities.map((act) => ({
             title: act.attraction || act.activity,
             description: `Cost: $${act.cost}. Rating: ${act.rating}`
          }))
        }]
      };

      set({ isLoading: false, tripData: mapped, error: null });
    } catch (err) {
      set({
        isLoading: false,
        error: err?.message || "Failed to generate trip via Agent. Please try again.",
      });
    }
  },

  // (fetchMyTrips is defined at top of store — calls /trips/mine)

  // Load a saved trip into the active viewer
  loadTrip: (trip) => {
    // If the trip has raw trip_data from the API, map it; otherwise use as-is
    const tripDataToLoad = trip.trip_data_mapped || trip;
    set({ tripData: tripDataToLoad, error: null });
  },

  // Activate a planned trip (change status to active)
  activateTrip: async (tripId) => {
    try {
      await api.patch(`/trips/${tripId}/activate`);
      // Update trips list locally
      set((state) => ({
        trips: state.trips.map((t) =>
          t.id === tripId ? { ...t, status: "active" } : t
        ),
      }));
      return true;
    } catch (err) {
      console.error("[tripStore] activateTrip failed:", err);
      return false;
    }
  },

  resetTrip: () => set({ tripData: null, isLoading: false, error: null }),
}));
