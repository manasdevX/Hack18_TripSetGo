// src/features/discover/discoverSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchFeed = createAsyncThunk('discover/fetchFeed', async ({ cursor, filters } = {}, { rejectWithValue }) => {
  try {
    const params = { limit: 12, ...(cursor ? { cursor } : {}), ...filters }
    const res = await api.get('/api/v1/discover/feed', { params })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch feed')
  }
})

export const searchTrips = createAsyncThunk('discover/searchTrips', async ({ query, filters }, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/discover/search', { params: { q: query, ...filters } })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Search failed')
  }
})

export const fetchTrending = createAsyncThunk('discover/fetchTrending', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/discover/trending')
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch trending')
  }
})

export const discoverLikeTrip = createAsyncThunk('discover/likeTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${id}/like`)
    return { id, ...res.data.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const discoverSaveTrip = createAsyncThunk('discover/saveTrip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/trips/${id}/save`)
    return { id, ...res.data.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const discoverSlice = createSlice({
  name: 'discover',
  initialState: {
    feed: [],
    trending: [],
    searchResults: null,
    cursor: null,
    hasMore: true,
    filters: {
      destination: '',
      minBudget: '',
      maxBudget: '',
      groupType: '',
      tags: [],
      sortBy: 'latest',
    },
    searchQuery: '',
    loading: false,
    loadingMore: false,
    error: null,
  },
  reducers: {
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; state.feed = []; state.cursor = null; state.hasMore = true },
    setSearchQuery: (state, action) => { state.searchQuery = action.payload },
    clearSearch: (state) => { state.searchResults = null; state.searchQuery = '' },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      // Feed
      .addCase(fetchFeed.pending, (state, action) => {
        if (!action.meta.arg?.cursor) { state.loading = true; state.feed = [] }
        else state.loadingMore = true
        state.error = null
      })
      .addCase(fetchFeed.fulfilled, (state, { payload }) => {
        state.loading = false
        state.loadingMore = false
        state.feed = state.cursor ? [...state.feed, ...payload.trips] : payload.trips
        state.cursor  = payload.nextCursor
        state.hasMore = payload.hasMore
      })
      .addCase(fetchFeed.rejected, (state, { payload }) => {
        state.loading = false; state.loadingMore = false; state.error = payload
      })
      // Search
      .addCase(searchTrips.pending,   (state) => { state.loading = true })
      .addCase(searchTrips.fulfilled, (state, { payload }) => { state.loading = false; state.searchResults = payload.trips })
      .addCase(searchTrips.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      // Trending
      .addCase(fetchTrending.fulfilled, (state, { payload }) => { state.trending = payload.destinations })
      // Like/Save in discover feed
      .addCase(discoverLikeTrip.fulfilled, (state, { payload }) => {
        const t = state.feed.find(t => t._id === payload.id)
        if (t) { t.likesCount = payload.likesCount; t.isLiked = payload.isLiked }
      })
      .addCase(discoverSaveTrip.fulfilled, (state, { payload }) => {
        const t = state.feed.find(t => t._id === payload.id)
        if (t) { t.savesCount = payload.savesCount; t.isSaved = payload.isSaved }
      })
  },
})

export const { setFilters, setSearchQuery, clearSearch, clearError } = discoverSlice.actions

export const selectFeed          = (state) => state.discover.feed
export const selectTrending      = (state) => state.discover.trending
export const selectSearchResults = (state) => state.discover.searchResults
export const selectDiscoverFilters = (state) => state.discover.filters
export const selectDiscoverLoading = (state) => state.discover.loading
export const selectHasMore       = (state) => state.discover.hasMore

export default discoverSlice.reducer
