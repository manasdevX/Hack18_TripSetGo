import { create } from "zustand";
import api from "../lib/api";

export const useDiscoverStore = create((set, get) => ({
  // Feed state
  trips: [],
  trendingTrips: [],
  isLoading: false,
  isTrendingLoading: false,
  error: null,
  page: 1,
  hasMore: true,
  total: 0,

  // Filters
  filters: {
    destination: "",
    budget_min: "",
    budget_max: "",
    group_type: "",
    duration_min: "",
    duration_max: "",
    sort: "trending",
  },

  // Search
  searchQuery: "",
  searchResults: [],
  isSearching: false,

  // Selected trip
  selectedTrip: null,
  isDetailLoading: false,

  // Comments
  comments: {},
  isCommentLoading: false,

  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters },
    trips: [],
    page: 1,
    hasMore: true,
    error: null,   // clear any previous error so fetch retries cleanly
  })),

  resetFeed: () => set({ trips: [], page: 1, hasMore: true }),

  // ── Fetch the discover feed ──────────────────────────────────────
  fetchFeed: async (reset = false) => {
    const state = get();
    if (state.isLoading) return;
    if (!reset && !state.hasMore) return;

    const currentPage = reset ? 1 : state.page;

    set({ isLoading: true, error: null });

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        sort: state.filters.sort,
      });

      if (state.filters.destination) params.append("destination", state.filters.destination);
      if (state.filters.budget_min) params.append("budget_min", state.filters.budget_min);
      if (state.filters.budget_max) params.append("budget_max", state.filters.budget_max);
      if (state.filters.group_type) params.append("group_type", state.filters.group_type);
      if (state.filters.duration_min) params.append("duration_min", state.filters.duration_min);
      if (state.filters.duration_max) params.append("duration_max", state.filters.duration_max);

      const res = await api.get(`/discover?${params.toString()}`);
      const data = res.data;

      set((state) => ({
        trips: reset ? data.trips : [...state.trips, ...data.trips],
        page: currentPage + 1,
        // Stop infinite scroll if no more pages OR empty result
        hasMore: data.has_more && data.trips.length > 0,
        total: data.total,
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      // CRITICAL: set hasMore=false on error to stop the infinite scroll loop
      set({
        error: err?.response?.data?.detail || "Failed to load trips",
        isLoading: false,
        hasMore: false,
      });
    }
  },

  // ── Fetch trending trips ────────────────────────────────────────
  fetchTrending: async () => {
    set({ isTrendingLoading: true });
    try {
      const res = await api.get("/discover/trending");
      set({ trendingTrips: res.data.trips || [], isTrendingLoading: false });
    } catch {
      // On error, just show empty (don't block the page)
      set({ trendingTrips: [], isTrendingLoading: false });
    }
  },

  // ── Search ──────────────────────────────────────────────────────
  searchTrips: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: "" });
      return;
    }
    set({ isSearching: true, searchQuery: query });
    try {
      const res = await api.get(`/discover/search?q=${encodeURIComponent(query)}&limit=20`);
      // Always set results (even empty array) — never leave isSearching=true
      set({ searchResults: res.data.trips || [], isSearching: false });
    } catch {
      // On error, show empty results instead of infinite spinner
      set({ searchResults: [], isSearching: false });
    }
  },

  // ── Get trip detail ─────────────────────────────────────────────
  fetchTripDetail: async (tripId) => {
    set({ isDetailLoading: true, selectedTrip: null });
    try {
      const res = await api.get(`/trips/${tripId}`);
      set({ selectedTrip: res.data, isDetailLoading: false });
    } catch (err) {
      set({ isDetailLoading: false });
    }
  },

  clearSelectedTrip: () => set({ selectedTrip: null }),

  // ── Like toggle ─────────────────────────────────────────────────
  toggleLike: async (tripId) => {
    // Optimistically update
    set((state) => ({
      trips: state.trips.map((t) =>
        t.trip_id === tripId
          ? { ...t, is_liked: !t.is_liked, likes: t.is_liked ? t.likes - 1 : t.likes + 1 }
          : t
      ),
      searchResults: state.searchResults.map((t) =>
        t.trip_id === tripId
          ? { ...t, is_liked: !t.is_liked, likes: t.is_liked ? t.likes - 1 : t.likes + 1 }
          : t
      ),
      selectedTrip: state.selectedTrip?.trip_id === tripId
        ? {
            ...state.selectedTrip,
            is_liked: !state.selectedTrip.is_liked,
            likes: state.selectedTrip.is_liked ? state.selectedTrip.likes - 1 : state.selectedTrip.likes + 1,
          }
        : state.selectedTrip,
      trendingTrips: state.trendingTrips.map((t) =>
        t.trip_id === tripId
          ? { ...t, is_liked: !t.is_liked, likes: t.is_liked ? t.likes - 1 : t.likes + 1 }
          : t
      ),
    }));

    try {
      await api.post(`/trips/${tripId}/like`);
    } catch {
      // Revert on error
      set((state) => ({
        trips: state.trips.map((t) =>
          t.trip_id === tripId
            ? { ...t, is_liked: !t.is_liked, likes: t.is_liked ? t.likes - 1 : t.likes + 1 }
            : t
        ),
      }));
    }
  },

  // ── Save toggle ─────────────────────────────────────────────────
  toggleSave: async (tripId) => {
    set((state) => ({
      trips: state.trips.map((t) =>
        t.trip_id === tripId
          ? { ...t, is_saved: !t.is_saved, saves: t.is_saved ? t.saves - 1 : t.saves + 1 }
          : t
      ),
      searchResults: state.searchResults.map((t) =>
        t.trip_id === tripId
          ? { ...t, is_saved: !t.is_saved, saves: t.is_saved ? t.saves - 1 : t.saves + 1 }
          : t
      ),
      selectedTrip: state.selectedTrip?.trip_id === tripId
        ? {
            ...state.selectedTrip,
            is_saved: !state.selectedTrip.is_saved,
            saves: state.selectedTrip.is_saved ? state.selectedTrip.saves - 1 : state.selectedTrip.saves + 1,
          }
        : state.selectedTrip,
    }));

    try {
      await api.post(`/trips/${tripId}/save`);
    } catch {
      set((state) => ({
        trips: state.trips.map((t) =>
          t.trip_id === tripId
            ? { ...t, is_saved: !t.is_saved, saves: t.is_saved ? t.saves - 1 : t.saves + 1 }
            : t
        ),
      }));
    }
  },

  // ── Comments ────────────────────────────────────────────────────
  fetchComments: async (tripId) => {
    try {
      const res = await api.get(`/trips/${tripId}/comments`);
      set((state) => ({
        comments: { ...state.comments, [tripId]: res.data.comments },
      }));
    } catch {}
  },

  addComment: async (tripId, comment) => {
    set({ isCommentLoading: true });
    try {
      const res = await api.post(`/trips/${tripId}/comment`, { comment });
      set((state) => ({
        comments: {
          ...state.comments,
          [tripId]: [res.data, ...(state.comments[tripId] || [])],
        },
        trips: state.trips.map((t) =>
          t.trip_id === tripId ? { ...t, comments_count: (t.comments_count || 0) + 1 } : t
        ),
        selectedTrip: state.selectedTrip?.trip_id === tripId
          ? { ...state.selectedTrip, comments_count: (state.selectedTrip.comments_count || 0) + 1 }
          : state.selectedTrip,
        isCommentLoading: false,
      }));
      return res.data;
    } catch (err) {
      set({ isCommentLoading: false });
      throw err;
    }
  },

  // ── Clone trip ──────────────────────────────────────────────────
  cloneTrip: async (tripId) => {
    try {
      const res = await api.post(`/trips/${tripId}/clone`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },
}));
