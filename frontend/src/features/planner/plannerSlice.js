// src/features/planner/plannerSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import api from '@/services/api'

// ── Async Thunks ─────────────────────────────────────────────────────────

export const generatePlan = createAsyncThunk('planner/generatePlan', async (formData, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/trips', formData)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to generate plan')
  }
})

export const saveTrip = createAsyncThunk('planner/saveTrip', async ({ tripId, selections }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/api/v1/trips/${tripId}`, { selections })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save trip')
  }
})

// Regenerate a single day of the live plan. Sends the names already used on the
// other days as `avoid` so the AI proposes fresh activities.
export const regenerateDay = createAsyncThunk('planner/regenerateDay', async ({ dayIndex }, { getState, rejectWithValue }) => {
  try {
    const { plan, form } = getState().planner
    if (!plan?.itinerary?.length) return rejectWithValue('No plan to regenerate')

    const destination = plan.meta?.destination || form.destination
    const totalDays   = plan.meta?.total_days || plan.itinerary.length
    const budget      = Number(form.budget) || Number(plan.meta?.total_budget) || 0

    const avoid = []
    plan.itinerary.forEach((d, i) => {
      if (i === dayIndex) return
      ;['morning', 'afternoon', 'evening'].forEach((slot) => {
        (d?.[slot]?.activities || []).forEach((a) => { if (a?.name) avoid.push(a.name) })
      })
    })

    const res = await api.post('/api/v1/planner/regenerate-day', {
      source:       form.source,
      destination,
      dayNumber:    dayIndex + 1,
      totalDays,
      budget,
      numTravelers: Number(form.numTravelers) || 1,
      groupType:    form.groupType || 'solo',
      preferences:  form.preferences || [],
      avoid:        avoid.slice(0, 60),
    })
    return { dayIndex, day: res.data.data.day, usedFallback: res.data.data.usedFallback }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to regenerate day')
  }
})

// ── Slice ─────────────────────────────────────────────────────────────────

// ── Drafts: named snapshots of the current selections (persisted on the trip) ──
export const fetchDrafts = createAsyncThunk('planner/fetchDrafts', async (tripId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/api/v1/trips/${tripId}/drafts`)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load drafts')
  }
})

export const saveDraft = createAsyncThunk('planner/saveDraft', async ({ tripId, name, selections, liveBudget, lockedDays }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${tripId}/drafts`, { name, selections, liveBudget, lockedDays })
    return res.data.data // { draft, drafts }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save draft')
  }
})

export const deleteDraft = createAsyncThunk('planner/deleteDraft', async ({ tripId, draftId }, { rejectWithValue }) => {
  try {
    const res = await api.delete(`/api/v1/trips/${tripId}/drafts/${draftId}`)
    return res.data.data // { _id, drafts }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete draft')
  }
})

const plannerSlice = createSlice({
  name: 'planner',
  initialState: {
    // Form state
    form: {
      source: '',
      destination: '',
      startDate: '',
      endDate: '',
      budget: '',
      numTravelers: 1,
      groupType: 'solo',
      pace: 'balanced',
      preferences: [],
    },
    // Generated plan from Gemini
    plan: null,
    tripId: null,
    // User selections (live budget tracking)
    selections: {
      transport: null,   // { mode, cost_per_person, total_cost }
      hotel: null,       // { name, tier, price_per_night }
      food: null,        // { name, cost_per_day, total_cost }
      activities: [],    // array of { day, slot, activity }
      favorites: [],     // heartedItems
    },
    // UI state
    loading: false,
    saving: false,
    error: null,
    activeDay: 0,
    activeTab: 'transport', // transport | hotels | food | itinerary | suggestions
    // Hero-planner state
    lockedDays: [],          // day indexes the user has locked from regeneration
    regeneratingDay: null,   // day index currently being regenerated (for spinners)
    drafts: [],              // saved selection snapshots for the current trip
    draftsLoading: false,
    savingDraft: false,
  },
  reducers: {
    updateForm: (state, action) => {
      state.form = { ...state.form, ...action.payload }
    },
    resetForm: (state) => {
      state.form = {
        source: '', destination: '', startDate: '', endDate: '',
        budget: '', numTravelers: 1, groupType: 'solo', pace: 'balanced', preferences: [],
      }
    },
    setPlan: (state, action) => {
      state.plan = action.payload.plan
      state.tripId = action.payload.tripId
      // Auto-select recommended transport + hotel
      if (action.payload.plan?.transport_options) {
        const rec = action.payload.plan.transport_options.find(t => t.recommended) || action.payload.plan.transport_options[0]
        if (rec) state.selections.transport = rec
      }
      if (action.payload.plan?.hotel_options) {
        state.selections.hotel = action.payload.plan.hotel_options[0]
      }
      if (action.payload.plan?.food_plans) {
        state.selections.food = action.payload.plan.food_plans[0]
      }
    },
    resetPlan: (state) => {
      state.plan = null
      state.tripId = null
      state.selections = { transport: null, hotel: null, food: null, activities: [], favorites: [] }
      state.activeDay = 0
      state.activeTab = 'transport'
      state.lockedDays = []
      state.regeneratingDay = null
      state.drafts = []
      state.error = null
    },
    loadDraft: (state, action) => {
      const d = action.payload || {}
      const s = d.selections || {}
      state.selections = {
        transport:  s.transport || null,
        hotel:      s.hotel || null,
        food:       s.food || null,
        activities: Array.isArray(s.activities) ? s.activities : [],
        favorites:  Array.isArray(s.favorites) ? s.favorites : [],
      }
      state.lockedDays = Array.isArray(d.lockedDays) ? d.lockedDays : []
    },
    toggleDayLock: (state, action) => {
      const dayIndex = action.payload
      const i = state.lockedDays.indexOf(dayIndex)
      if (i >= 0) state.lockedDays.splice(i, 1)
      else state.lockedDays.push(dayIndex)
    },
    selectTransport: (state, action) => {
      state.selections.transport = action.payload
    },
    selectHotel: (state, action) => {
      state.selections.hotel = action.payload
    },
    selectFood: (state, action) => {
      state.selections.food = action.payload
    },
    toggleActivity: (state, action) => {
      const { day, slot, activity } = action.payload
      const key = `${day}-${slot}-${activity.name}`
      const idx = state.selections.activities.findIndex(a => `${a.day}-${a.slot}-${a.activity.name}` === key)
      if (idx >= 0) {
        state.selections.activities.splice(idx, 1)
      } else {
        // Remove other activity in same slot
        state.selections.activities = state.selections.activities.filter(a => !(a.day === day && a.slot === slot))
        state.selections.activities.push({ day, slot, activity })
      }
    },
    toggleFavorite: (state, action) => {
      const { id } = action.payload
      const idx = state.selections.favorites.indexOf(id)
      if (idx >= 0) state.selections.favorites.splice(idx, 1)
      else state.selections.favorites.push(id)
    },
    setActiveDay: (state, action) => { state.activeDay = action.payload },
    setActiveTab: (state, action) => { state.activeTab = action.payload },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generatePlan.pending,   (state) => { state.loading = true; state.error = null; state.plan = null })
      .addCase(generatePlan.fulfilled, (state, { payload }) => {
        state.loading = false
        state.plan = payload.plan
        state.tripId = payload.tripId || payload._id
        // Auto-select recommended options
        if (payload.plan?.transport_options?.length) {
          const rec = payload.plan.transport_options.find(t => t.recommended) || payload.plan.transport_options[0]
          state.selections.transport = rec
        }
        if (payload.plan?.hotel_options?.length)  state.selections.hotel = payload.plan.hotel_options[0]
        if (payload.plan?.food_plans?.length)      state.selections.food  = payload.plan.food_plans[0]
      })
      .addCase(generatePlan.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

      .addCase(saveTrip.pending,   (state) => { state.saving = true })
      .addCase(saveTrip.fulfilled, (state) => { state.saving = false })
      .addCase(saveTrip.rejected,  (state, { payload }) => { state.saving = false; state.error = payload })

      .addCase(regenerateDay.pending, (state, { meta }) => {
        state.regeneratingDay = meta.arg.dayIndex
        state.error = null
      })
      .addCase(regenerateDay.fulfilled, (state, { payload }) => {
        state.regeneratingDay = null
        const slot = state.plan?.itinerary?.[payload.dayIndex]
        if (slot) {
          // Keep the original day number/date; swap in the new activities.
          state.plan.itinerary[payload.dayIndex] = {
            ...payload.day,
            day:  slot.day ?? payload.day.day,
            date: slot.date,
          }
          // Drop now-stale activity selections for this day so the live budget stays correct.
          state.selections.activities = state.selections.activities.filter((a) => a.day !== payload.dayIndex)
        }
      })
      .addCase(regenerateDay.rejected, (state, { payload }) => {
        state.regeneratingDay = null
        state.error = payload
      })

      .addCase(fetchDrafts.pending,   (state) => { state.draftsLoading = true })
      .addCase(fetchDrafts.fulfilled, (state, { payload }) => { state.draftsLoading = false; state.drafts = payload || [] })
      .addCase(fetchDrafts.rejected,  (state) => { state.draftsLoading = false })

      .addCase(saveDraft.pending,   (state) => { state.savingDraft = true; state.error = null })
      .addCase(saveDraft.fulfilled, (state, { payload }) => { state.savingDraft = false; state.drafts = payload.drafts || [] })
      .addCase(saveDraft.rejected,  (state, { payload }) => { state.savingDraft = false; state.error = payload })

      .addCase(deleteDraft.fulfilled, (state, { payload }) => { state.drafts = payload.drafts || [] })
  },
})

export const {
  updateForm, resetForm, setPlan, resetPlan,
  selectTransport, selectHotel, selectFood,
  toggleActivity, toggleFavorite, toggleDayLock, loadDraft,
  setActiveDay, setActiveTab, clearError,
} = plannerSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────

export const selectPlanner      = (state) => state.planner
export const selectPlan         = (state) => state.planner.plan
export const selectSelections   = (state) => state.planner.selections
export const selectPlannerForm  = (state) => state.planner.form
export const selectPlannerLoading = (state) => state.planner.loading

/** Derived live budget — recomputes only when selections change */
export const selectLiveBudget = createSelector(
  selectSelections,
  selectPlan,
  (selections, plan) => {
    if (!plan) return 0
    const days = plan?.meta?.total_days || 1
    const transportCost  = selections.transport?.total_cost || 0
    const hotelCost      = (selections.hotel?.price_per_night || 0) * days
    const foodCost       = selections.food?.total_cost || 0
    const activitiesCost = selections.activities.reduce((sum, a) => sum + (a.activity?.cost || 0), 0)
    return transportCost + hotelCost + foodCost + activitiesCost
  }
)

export const selectBudgetStatus = createSelector(
  selectLiveBudget,
  selectPlannerForm,
  (liveBudget, form) => {
    const budget = Number(form.budget) || 0
    if (budget === 0) return 'neutral'
    const ratio = liveBudget / budget
    if (ratio <= 0.8)  return 'green'
    if (ratio <= 1.0)  return 'amber'
    return 'red'
  }
)

export default plannerSlice.reducer
