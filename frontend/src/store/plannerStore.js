import { create } from "zustand";
import api from "../lib/api";

export const usePlannerStore = create((set, get) => ({
  // ── Plan state ────────────────────────────────────────────────────────────
  isPlanning: false,
  plan: null,
  error: null,
  progress: 0,
  progressLabel: "",

  // ── User selections ───────────────────────────────────────────────────────
  selectedTransport: null,      // transport option id
  selectedHotel: null,          // hotel option id
  selectedFood: null,           // food plan id
  selectedActivities: {},       // { "d1_morning": "act_id", ... }
  savedFavorites: [],           // activity ids

  // ── Computed: live budget ─────────────────────────────────────────────────
  getLiveCost: () => {
    const { plan, selectedTransport, selectedHotel, selectedFood, selectedActivities } = get();
    if (!plan) return { transport: 0, hotel: 0, food: 0, activities: 0, total: 0 };

    const tx = plan.transport_options?.find((t) => t.id === selectedTransport);
    const ht = plan.hotel_options?.find((h) => h.id === selectedHotel);
    const fd = plan.food_plans?.find((f) => f.id === selectedFood);

    // Activities cost: sum all selected
    let actCost = 0;
    plan.itinerary?.forEach((day) => {
      ["morning", "afternoon", "evening"].forEach((slot) => {
        const key = `d${day.day}_${slot}`;
        const selId = selectedActivities[key];
        if (selId) {
          const act = day[slot]?.activities?.find((a) => a.id === selId);
          if (act) actCost += act.cost || 0;
        }
      });
    });

    const transport = tx?.total_cost || 0;
    const hotel = ht?.total_stay_cost || 0;
    const food = fd?.total_cost || 0;
    const total = transport + hotel + food + actCost;

    return { transport, hotel, food, activities: actCost, total };
  },

  // ── Actions ──────────────────────────────────────────────────────────────

  planTrip: async (formData) => {
    set({ isPlanning: true, plan: null, error: null, progress: 0, selectedTransport: null, selectedHotel: null, selectedFood: null, selectedActivities: {}, savedFavorites: [] });

    const steps = [
      { pct: 10, label: "🔍 Analyzing your preferences..." },
      { pct: 25, label: "🏨 Finding best hotels..." },
      { pct: 40, label: "✈️ Comparing transport options..." },
      { pct: 55, label: "📍 Curating activities..." },
      { pct: 70, label: "🗓️ Building day-by-day plans..." },
      { pct: 85, label: "💡 Generating AI suggestions..." },
      { pct: 95, label: "✨ Finalizing your options..." },
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length && get().isPlanning) {
        set({ progress: steps[stepIdx].pct, progressLabel: steps[stepIdx].label });
        stepIdx++;
      }
    }, 200);

    try {
      const res = await api.post("/trips", {
        source: formData.source,
        destination: formData.destination,
        start_date: formData.startDate,
        end_date: formData.endDate,
        budget: Number(formData.budget),
        num_travelers: Number(formData.travelers),
        group_type: formData.groupType,
        preferences: formData.preferences || [],
      });
      clearInterval(interval);

      const planData = res.data;

      // Auto-select recommended options by default
      const recTransport = planData.transport_options?.find((t) => t.recommended)?.id || planData.transport_options?.[0]?.id;
      const recHotel = planData.hotel_options?.find((h) => h.recommended)?.id || planData.hotel_options?.[1]?.id;
      const recFood = planData.food_plans?.find((f) => f.recommended)?.id || planData.food_plans?.[1]?.id;

      // Auto-select first activity per slot
      const autoActivities = {};
      planData.itinerary?.forEach((day) => {
        ["morning", "afternoon", "evening"].forEach((slot) => {
          const first = day[slot]?.activities?.[0];
          if (first) autoActivities[`d${day.day}_${slot}`] = first.id;
        });
      });

      set({
        plan: planData,
        isPlanning: false,
        progress: 100,
        progressLabel: "✅ Your interactive plan is ready!",
        error: null,
        selectedTransport: recTransport,
        selectedHotel: recHotel,
        selectedFood: recFood,
        selectedActivities: autoActivities,
      });
    } catch (err) {
      clearInterval(interval);
      let errorMsg = "Planning failed. Try again.";
      const detail = err?.response?.data?.detail;
      
      if (typeof detail === "string") {
        errorMsg = detail;
      } else if (detail && typeof detail === "object") {
        if (detail.error && detail.daily_limit !== undefined) {
          errorMsg = `${detail.error} (Used ${detail.daily_usage}/${detail.daily_limit} on ${detail.plan} plan)`;
        } else if (detail.error) {
          errorMsg = detail.error;
        } else {
          errorMsg = JSON.stringify(detail);
        }
      }
      
      set({ error: errorMsg, isPlanning: false, progress: 0 });
      throw err;
    }
  },

  selectTransport: (id) => set({ selectedTransport: id }),
  selectHotel: (id) => set({ selectedHotel: id }),
  selectFood: (id) => set({ selectedFood: id }),
  selectActivity: (daySlotKey, actId) =>
    set((s) => ({ selectedActivities: { ...s.selectedActivities, [daySlotKey]: actId } })),
  toggleFavorite: (id) =>
    set((s) => ({
      savedFavorites: s.savedFavorites.includes(id)
        ? s.savedFavorites.filter((f) => f !== id)
        : [...s.savedFavorites, id],
    })),

  resetPlan: () => set({ plan: null, error: null, isPlanning: false, progress: 0, progressLabel: "", selectedTransport: null, selectedHotel: null, selectedFood: null, selectedActivities: {}, savedFavorites: [] }),
}));
