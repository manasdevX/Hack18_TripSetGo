import { create } from "zustand";
import api from "../lib/api";

export const usePlannerStore = create((set, get) => ({
  // ── Plan state ─────────────────────────────────────────────────────────────
  isPlanning: false,
  plan: null,
  error: null,
  progress: 0,
  progressLabel: "",
  isSaving: false,
  savedTripId: null,

  // ── User selections ────────────────────────────────────────────────────────
  selectedTransport: null,
  selectedHotel: null,
  selectedFood: null,
  selectedActivities: {},   // { "d1_morning": "act_id" }
  savedFavorites: [],        // activity/hotel ids

  // ── Compare mode ──────────────────────────────────────────────────────────
  compareList: [],           // list of activity ids being compared

  // ── View mode ─────────────────────────────────────────────────────────────
  activeTab: "transport",    // transport | hotel | food | itinerary | summary

  // ── Computed: live budget ─────────────────────────────────────────────────
  getLiveCost: () => {
    const { plan, selectedTransport, selectedHotel, selectedFood, selectedActivities } = get();
    if (!plan) return { transport: 0, hotel: 0, food: 0, activities: 0, total: 0 };
    const tx = plan.transport_options?.find((t) => t.id === selectedTransport);
    const ht = plan.hotel_options?.find((h) => h.id === selectedHotel);
    const fd = plan.food_plans?.find((f) => f.id === selectedFood);
    let actCost = 0;
    plan.itinerary?.forEach((day) => {
      ["morning", "afternoon", "evening"].forEach((slot) => {
        const key = `d${day.day}_${slot}`;
        const selId = selectedActivities[key];
        const act = day[slot]?.activities?.find((a) => a.id === selId);
        if (act) actCost += act.cost || 0;
      });
    });
    const transport = tx?.total_cost || 0;
    const hotel = ht?.total_stay_cost || 0;
    const food = fd?.total_cost || 0;
    const total = transport + hotel + food + actCost;
    return { transport, hotel, food, activities: actCost, total };
  },

  // ── Generate plan ─────────────────────────────────────────────────────────
  planTrip: async (formData) => {
    set({ isPlanning: true, plan: null, error: null, progress: 0, savedTripId: null, selectedTransport: null, selectedHotel: null, selectedFood: null, selectedActivities: {}, savedFavorites: [], compareList: [], activeTab: "transport" });

    const steps = [
      { pct: 10, label: "🔍 Searching vector database..." },
      { pct: 25, label: "🏨 Retrieving hotel options..." },
      { pct: 40, label: "✈️ Comparing transport routes..." },
      { pct: 55, label: "📍 Curating activities from vector store..." },
      { pct: 70, label: "🤖 Running RAG pipeline with Groq AI..." },
      { pct: 85, label: "💡 Generating smart suggestions..." },
      { pct: 95, label: "✨ Finalizing your interactive plan..." },
    ];
    let si = 0;
    const iv = setInterval(() => {
      if (si < steps.length && get().isPlanning) {
        set({ progress: steps[si].pct, progressLabel: steps[si].label });
        si++;
      }
    }, 300);

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
      clearInterval(iv);
      const planData = res.data;

      // Auto-select recommended
      const recT = planData.transport_options?.find((t) => t.recommended)?.id || planData.transport_options?.[0]?.id;
      const recH = planData.hotel_options?.find((h) => h.recommended)?.id || planData.hotel_options?.[1]?.id;
      const recF = planData.food_plans?.find((f) => f.recommended)?.id || planData.food_plans?.[1]?.id;
      const autoActs = {};
      planData.itinerary?.forEach((day) => {
        ["morning", "afternoon", "evening"].forEach((slot) => {
          const first = day[slot]?.activities?.[0];
          if (first) autoActs[`d${day.day}_${slot}`] = first.id;
        });
      });

      set({ plan: planData, isPlanning: false, progress: 100, progressLabel: "✅ Interactive plan ready!", error: null, selectedTransport: recT, selectedHotel: recH, selectedFood: recF, selectedActivities: autoActs, activeTab: "transport" });
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

  // ── Save finalized trip ───────────────────────────────────────────────────
  saveTrip: async (formData) => {
    const { plan, selectedTransport, selectedHotel, selectedFood, selectedActivities, getLiveCost } = get();
    if (!plan) return;
    set({ isSaving: true });
    try {
      const cost = getLiveCost();
      const tx = plan.transport_options?.find((t) => t.id === selectedTransport);
      const ht = plan.hotel_options?.find((h) => h.id === selectedHotel);
      const fd = plan.food_plans?.find((f) => f.id === selectedFood);

      // Build selected activity objects
      const selActObjs = {};
      plan.itinerary?.forEach((day) => {
        ["morning", "afternoon", "evening"].forEach((slot) => {
          const key = `d${day.day}_${slot}`;
          const selId = selectedActivities[key];
          const act = day[slot]?.activities?.find((a) => a.id === selId);
          if (act) selActObjs[key] = act;
        });
      });

      const res = await api.post("/trips/save", {
        destination: plan.meta?.destination || formData?.destination || "",
        source: plan.meta?.source || formData?.source || "",
        start_date: formData?.startDate || "",
        end_date: formData?.endDate || "",
        budget: plan.meta?.total_budget || 0,
        num_travelers: plan.meta?.num_travelers || 1,
        group_type: plan.meta?.group_type || "friends",
        duration_days: plan.meta?.total_days || 1,
        selected_transport: tx || null,
        selected_hotel: ht || null,
        selected_food: fd || null,
        selected_activities: selActObjs,
        total_cost: cost.total,
        plan_summary: plan.meta?.summary_text || "",
        tags: plan.meta?.tags || [],
        is_public: false,
        full_plan: plan,
      });

      set({ isSaving: false, savedTripId: res.data?.trip?.id });
      return res.data;
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  // ── Selections ─────────────────────────────────────────────────────────────
  selectTransport: (id) => set({ selectedTransport: id }),
  selectHotel: (id)    => set({ selectedHotel: id }),
  selectFood: (id)     => set({ selectedFood: id }),
  selectActivity: (key, actId) => set((s) => ({ selectedActivities: { ...s.selectedActivities, [key]: actId } })),
  toggleFavorite: (id) => set((s) => ({ savedFavorites: s.savedFavorites.includes(id) ? s.savedFavorites.filter((f) => f !== id) : [...s.savedFavorites, id] })),
  setActiveTab: (tab)  => set({ activeTab: tab }),

  // ── Compare ────────────────────────────────────────────────────────────────
  toggleCompare: (id) => set((s) => {
    const list = s.compareList.includes(id) ? s.compareList.filter((c) => c !== id) : s.compareList.length < 3 ? [...s.compareList, id] : s.compareList;
    return { compareList: list };
  }),
  clearCompare: () => set({ compareList: [] }),

  // ── Reset ──────────────────────────────────────────────────────────────────
  resetPlan: () => set({ plan: null, error: null, isPlanning: false, progress: 0, progressLabel: "", isSaving: false, savedTripId: null, selectedTransport: null, selectedHotel: null, selectedFood: null, selectedActivities: {}, savedFavorites: [], compareList: [], activeTab: "transport" }),
}));
