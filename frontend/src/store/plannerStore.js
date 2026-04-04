import { create } from "zustand";
import api from "../lib/api";

export const usePlannerStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────
  isPlanning: false,
  result: null,
  error: null,
  progress: 0,
  progressLabel: "",

  // ── Actions ─────────────────────────────────────────────────────────────

  planTrip: async (formData) => {
    set({ isPlanning: true, result: null, error: null, progress: 0, progressLabel: "Initializing planner..." });

    // Simulate multi-step progress for UX (engine is instant, but show steps)
    const steps = [
      { pct: 15, label: "🗺️ Validating destination..." },
      { pct: 30, label: "✈️ Calculating transport options..." },
      { pct: 50, label: "🏨 Selecting best accommodation..." },
      { pct: 70, label: "📅 Building day-by-day itinerary..." },
      { pct: 85, label: "💰 Optimizing budget breakdown..." },
      { pct: 95, label: "🎯 Finalizing your plan..." },
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length && get().isPlanning) {
        set({ progress: steps[stepIdx].pct, progressLabel: steps[stepIdx].label });
        stepIdx++;
      }
    }, 220);

    try {
      const res = await api.post("/trips", {
        source: formData.source,
        destination: formData.destination,
        start_date: formData.startDate,
        end_date: formData.endDate,
        budget: Number(formData.budget),
        num_travelers: Number(formData.travelers),
        group_type: formData.groupType,
      });

      clearInterval(interval);
      set({
        result: res.data,
        isPlanning: false,
        progress: 100,
        progressLabel: "✅ Plan ready!",
        error: null,
      });
    } catch (err) {
      clearInterval(interval);
      const detail = err?.response?.data?.detail || "Failed to plan trip. Please try again.";
      set({ error: detail, isPlanning: false, progress: 0, progressLabel: "" });
      throw err;
    }
  },

  resetPlan: () => set({ result: null, error: null, isPlanning: false, progress: 0, progressLabel: "" }),
}));
