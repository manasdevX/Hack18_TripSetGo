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

  // Generate a new trip via planning engine
  generateTrip: async (searchParams) => {
    set({ isLoading: true, error: null, tripData: null });

    try {
      const payload = {
        source: searchParams.source || searchParams.origin,
        destination: searchParams.destination,
        start_date: searchParams.startDate || searchParams.start_date,
        end_date: searchParams.endDate || searchParams.end_date,
        budget: Number(searchParams.budget),
        num_travelers: Number(searchParams.travelers || searchParams.travellers) || 1,
        group_type: searchParams.groupType || searchParams.group_type || "friends",
        preferences: searchParams.preferences || null,
      };

      const response = await api.post("/trips", payload);
      const mapped = get()._mapOrchestratorToDashboardTrip(
        response.data,
        searchParams
      );

      if (!mapped) {
        if (response.data?.status === "need_more_info") {
          throw new Error(response.data?.question || "Need more information to plan the trip.");
        }
        throw new Error(response.data?.warnings?.[0] || "Trip generation failed");
      }

      set({ isLoading: false, tripData: mapped, error: null });
    } catch (err) {
      set({
        isLoading: false,
        error: err?.response?.data?.detail || err?.message || "Failed to generate trip. Please try again.",
      });
    }
  },

  // Fetch all saved trips for the current user
  fetchMyTrips: async () => {
    try {
      const res = await api.get("/my-discover-trips");
      const trips = Array.isArray(res.data) ? res.data : (res.data?.trips || []);
      set({ trips, tripsLoaded: true });
      return trips;
    } catch (err) {
      console.error("[tripStore] fetchMyTrips failed:", err);
      set({ trips: [], tripsLoaded: true });
      return [];
    }
  },

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
