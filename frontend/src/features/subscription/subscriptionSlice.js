// src/features/subscription/subscriptionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'
import { updateUser } from '@/features/auth/authSlice'

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchSubscriptionStatus = createAsyncThunk(
  'subscription/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/v1/subscriptions/status')
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load subscription status')
    }
  }
)

export const fetchPlans = createAsyncThunk(
  'subscription/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/v1/subscriptions/plans')
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load plans')
    }
  }
)

export const createOrder = createAsyncThunk(
  'subscription/createOrder',
  async (planId, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/v1/subscriptions/create-order', { planId })
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create order')
    }
  }
)

export const verifyPayment = createAsyncThunk(
  'subscription/verifyPayment',
  async (paymentData, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post('/api/v1/subscriptions/verify-payment', paymentData)
      // Sync auth.user.plan immediately — prevents plan-gating components from
      // showing "Free" state after upgrade until next fetchMe (Bug #5)
      dispatch(updateUser({ plan: 'pro' }))
      // Re-fetch fresh subscription status from server to get all fields
      dispatch(fetchSubscriptionStatus())
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Payment verification failed')
    }
  }
)

export const fetchPaymentHistory = createAsyncThunk(
  'subscription/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/api/v1/subscriptions/history')
      return res.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load payment history')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: {
    plan:           'free',
    isActive:       false,
    startDate:      null,
    endDate:        null,
    usage:          { searchesToday: 0, searchLimit: 5 },
    plans:          [],
    paymentHistory: [],
    pendingOrder:   null,
    loading:        false,   // true while createOrder is in-flight
    verifying:      false,   // true while verifyPayment is in-flight
    error:          null,
  },
  reducers: {
    incrementUsage: (state) => { state.usage.searchesToday += 1 },
    clearError:     (state) => { state.error = null },
    clearPending:   (state) => { state.pendingOrder = null },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchSubscriptionStatus ──────────────────────────────────────────
      .addCase(fetchSubscriptionStatus.fulfilled, (state, { payload }) => {
        state.plan      = payload.plan
        state.isActive  = payload.isActive
        state.startDate = payload.startDate
        state.endDate   = payload.endDate
        state.usage     = payload.usage
      })
      .addCase(fetchSubscriptionStatus.rejected, (state, { payload }) => {
        // Non-fatal: keep previous state; surface error for optional display
        state.error = payload
      })

      // ── fetchPlans ───────────────────────────────────────────────────────
      .addCase(fetchPlans.fulfilled, (state, { payload }) => {
        state.plans = payload
      })

      // ── createOrder ──────────────────────────────────────────────────────
      .addCase(createOrder.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(createOrder.fulfilled, (state, { payload }) => {
        state.loading      = false
        state.pendingOrder = payload
      })
      .addCase(createOrder.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })

      // ── verifyPayment ────────────────────────────────────────────────────
      .addCase(verifyPayment.pending, (state) => {
        state.verifying = true
        state.error     = null
      })
      .addCase(verifyPayment.fulfilled, (state, { payload }) => {
        state.verifying    = false
        state.plan         = payload.plan
        state.isActive     = true
        state.pendingOrder = null
        state.endDate      = payload.endDate
        state.startDate    = payload.startDate
        if (state.usage) {
          state.usage.searchLimit = payload.searchLimit
        }
      })
      .addCase(verifyPayment.rejected, (state, { payload }) => {
        state.verifying = false
        state.error     = payload
      })

      // ── fetchPaymentHistory ──────────────────────────────────────────────
      .addCase(fetchPaymentHistory.fulfilled, (state, { payload }) => {
        state.paymentHistory = payload
      })
  },
})

export const { incrementUsage, clearError, clearPending } = subscriptionSlice.actions

// ── Selectors ─────────────────────────────────────────────────────────────────
export const selectSubscription    = (state) => state.subscription
export const selectPlan            = (state) => state.subscription.plan
export const selectUsage           = (state) => state.subscription.usage
export const selectIsProActive     = (state) => state.subscription.plan === 'pro' && state.subscription.isActive
export const selectSubLoading      = (state) => state.subscription.loading
export const selectSubVerifying    = (state) => state.subscription.verifying
export const selectSearchLimitLeft = (state) =>
  (state.subscription.usage?.searchLimit ?? 5) - (state.subscription.usage?.searchesToday ?? 0)

export default subscriptionSlice.reducer
