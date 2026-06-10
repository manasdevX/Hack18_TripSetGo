// src/features/notifications/notificationsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchNotifications = createAsyncThunk('notifications/fetch', async ({ page = 1 } = {}, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/notifications', { params: { page, limit: 20 } })
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const markRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await api.put(`/api/v1/notifications/${id}/read`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await api.put('/api/v1/notifications/read-all')
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    addSocketNotification: (state, action) => {
      state.items.unshift(action.payload)
      state.unreadCount += 1
    },
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending,   (state) => { state.loading = true })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.loading = false
        state.items = payload.notifications
        state.unreadCount = payload.unreadCount
      })
      .addCase(fetchNotifications.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      .addCase(markRead.fulfilled, (state, { payload: id }) => {
        const n = state.items.find(n => n._id === id)
        if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1) }
      })
      .addCase(markAllRead.fulfilled, (state) => {
        state.items.forEach(n => { n.isRead = true })
        state.unreadCount = 0
      })
  },
})

export const { addSocketNotification, clearError } = notificationsSlice.actions

export const selectNotifications = (state) => state.notifications.items
export const selectUnreadCount   = (state) => state.notifications.unreadCount

export default notificationsSlice.reducer
