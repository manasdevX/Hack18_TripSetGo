// src/features/trips/tripsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchMyTrips = createAsyncThunk('trips/fetchMyTrips', async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/trips/my-trips', { params: { page, limit } })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch trips')
  }
})

export const fetchTrip = createAsyncThunk('trips/fetchTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/api/v1/trips/${id}`)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch trip')
  }
})

export const likeTrip = createAsyncThunk('trips/likeTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${id}/like`)
    return { id, ...res.data.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to like trip')
  }
})

export const saveTrip = createAsyncThunk('trips/saveTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${id}/save`)
    return { id, ...res.data.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save trip')
  }
})

export const cloneTrip = createAsyncThunk('trips/cloneTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${id}/clone`)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to clone trip')
  }
})

export const deleteTrip = createAsyncThunk('trips/deleteTrip', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/api/v1/trips/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete trip')
  }
})

export const shareTrip = createAsyncThunk('trips/shareTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${id}/share`)
    return { id, shareUrl: res.data.data.shareUrl }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to share trip')
  }
})

export const addComment = createAsyncThunk('trips/addComment', async ({ tripId, text }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${tripId}/comment`, { text })
    return { tripId, comment: res.data.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

const tripsSlice = createSlice({
  name: 'trips',
  initialState: {
    trips: [],
    currentTrip: null,
    total: 0,
    page: 1,
    hasMore: true,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
    clearCurrentTrip: (state) => { state.currentTrip = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTrips.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchMyTrips.fulfilled, (state, { payload }) => {
        state.loading = false
        state.trips   = payload.trips
        state.total   = payload.total
        state.hasMore = payload.hasMore
      })
      .addCase(fetchMyTrips.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

      .addCase(fetchTrip.pending,   (state) => { state.loading = true })
      .addCase(fetchTrip.fulfilled, (state, { payload }) => { state.loading = false; state.currentTrip = payload })
      .addCase(fetchTrip.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

      .addCase(likeTrip.fulfilled, (state, { payload }) => {
        const t = state.trips.find(t => t._id === payload.id)
        if (t) { t.likesCount = payload.likesCount; t.isLiked = payload.isLiked }
        if (state.currentTrip?._id === payload.id) {
          state.currentTrip.likesCount = payload.likesCount
          state.currentTrip.isLiked = payload.isLiked
        }
      })
      .addCase(saveTrip.fulfilled, (state, { payload }) => {
        const t = state.trips.find(t => t._id === payload.id)
        if (t) { t.savesCount = payload.savesCount; t.isSaved = payload.isSaved }
      })
      .addCase(cloneTrip.fulfilled, (state, { payload }) => {
        state.trips.unshift(payload)
      })
      .addCase(deleteTrip.fulfilled, (state, { payload: id }) => {
        state.trips = state.trips.filter(t => t._id !== id)
      })
      .addCase(addComment.fulfilled, (state, { payload }) => {
        if (state.currentTrip?._id === payload.tripId) {
          state.currentTrip.comments = state.currentTrip.comments || []
          state.currentTrip.comments.push(payload.comment)
          state.currentTrip.commentsCount = (state.currentTrip.commentsCount || 0) + 1
        }
      })
  },
})

export const { clearError, clearCurrentTrip } = tripsSlice.actions

export const selectTrips        = (state) => state.trips.trips
export const selectCurrentTrip  = (state) => state.trips.currentTrip
export const selectTripsLoading = (state) => state.trips.loading
export const selectTripsError   = (state) => state.trips.error

export default tripsSlice.reducer
