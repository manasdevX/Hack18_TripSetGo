// src/features/subscription/subscriptionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchSubscriptionStatus = createAsyncThunk('subscription/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/subscriptions/status')
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const fetchPlans = createAsyncThunk('subscription/fetchPlans', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/subscriptions/plans')
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const createOrder = createAsyncThunk('subscription/createOrder', async (planId, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/subscriptions/create-order', { planId })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const verifyPayment = createAsyncThunk('subscription/verifyPayment', async (paymentData, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/subscriptions/verify-payment', paymentData)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: {
    plan: 'free',
    isActive: false,
    startDate: null,
    endDate: null,
    usage: { searchesToday: 0, searchLimit: 5 },
    plans: [],
    pendingOrder: null,
    loading: false,
    error: null,
  },
  reducers: {
    incrementUsage: (state) => { state.usage.searchesToday += 1 },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionStatus.fulfilled, (state, { payload }) => {
        state.plan = payload.plan
        state.isActive = payload.isActive
        state.startDate = payload.startDate
        state.endDate = payload.endDate
        state.usage = payload.usage
      })
      .addCase(fetchPlans.fulfilled, (state, { payload }) => { state.plans = payload })
      .addCase(createOrder.pending,   (state) => { state.loading = true })
      .addCase(createOrder.fulfilled, (state, { payload }) => { state.loading = false; state.pendingOrder = payload })
      .addCase(createOrder.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      .addCase(verifyPayment.fulfilled, (state, { payload }) => {
        state.plan = payload.plan
        state.isActive = true
        state.pendingOrder = null
        state.endDate = payload.endDate
        state.usage.searchLimit = payload.searchLimit
      })
  },
})

export const { incrementUsage, clearError } = subscriptionSlice.actions

export const selectSubscription    = (state) => state.subscription
export const selectPlan            = (state) => state.subscription.plan
export const selectUsage           = (state) => state.subscription.usage
export const selectSearchLimitLeft = (state) =>
  state.subscription.usage.searchLimit - state.subscription.usage.searchesToday

export default subscriptionSlice.reducer
