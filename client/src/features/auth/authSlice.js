// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

// ── Async Thunks ─────────────────────────────────────────────────────────

export const signup = createAsyncThunk('auth/signup', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/auth/signup', data)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Signup failed')
  }
})

export const verifyOTP = createAsyncThunk('auth/verifyOTP', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/auth/verify-otp', data)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'OTP verification failed')
  }
})

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/auth/login', data)
    const { accessToken, user } = res.data.data
    localStorage.setItem('accessToken', accessToken)
    return { user, accessToken }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await api.post('/api/v1/auth/logout')
    localStorage.removeItem('accessToken')
  } catch (err) {
    localStorage.removeItem('accessToken')
    return rejectWithValue(err.response?.data?.message || 'Logout failed')
  }
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/users/me')
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user')
  }
})

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/auth/forgot-password', data)
    return res.data.message
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send reset email')
  }
})

export const resetPassword = createAsyncThunk('auth/resetPassword', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/auth/reset-password', data)
    return res.data.message
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Reset failed')
  }
})

// ── Slice ─────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken') || null,
    isAuthenticated: false,
    loading: false,
    error: null,
    successMessage: null,
    pendingEmail: null, // used for OTP flow
  },
  reducers: {
    clearError: (state) => { state.error = null },
    clearSuccess: (state) => { state.successMessage = null },
    setPendingEmail: (state, action) => { state.pendingEmail = action.payload },
    setGoogleUser: (state, action) => {
      const { user, accessToken } = action.payload
      state.user = user
      state.accessToken = accessToken
      state.isAuthenticated = true
      localStorage.setItem('accessToken', accessToken)
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signup.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(signup.fulfilled, (state, { payload }) => {
        state.loading = false
        state.pendingEmail = payload.email
        state.successMessage = 'OTP sent to your email'
      })
      .addCase(signup.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    // OTP
      .addCase(verifyOTP.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(verifyOTP.fulfilled, (state) => {
        state.loading = false
        state.successMessage = 'Email verified! Please log in.'
      })
      .addCase(verifyOTP.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    // Login
      .addCase(login.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.loading = false
        state.user = payload.user
        state.accessToken = payload.accessToken
        state.isAuthenticated = true
      })
      .addCase(login.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })

    // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
      })

    // FetchMe
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload
        state.isAuthenticated = true
        state.loading = false
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null
        state.isAuthenticated = false
        state.accessToken = null
        localStorage.removeItem('accessToken')
      })

    // Forgot/Reset password
      .addCase(forgotPassword.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(forgotPassword.fulfilled, (state, { payload }) => { state.loading = false; state.successMessage = payload })
      .addCase(forgotPassword.rejected,  (state, { payload }) => { state.loading = false; state.error = payload })
      .addCase(resetPassword.pending,    (state) => { state.loading = true; state.error = null })
      .addCase(resetPassword.fulfilled,  (state, { payload }) => { state.loading = false; state.successMessage = payload })
      .addCase(resetPassword.rejected,   (state, { payload }) => { state.loading = false; state.error = payload })
  },
})

export const { clearError, clearSuccess, setPendingEmail, setGoogleUser, updateUser } = authSlice.actions

// Selectors
export const selectAuth          = (state) => state.auth
export const selectUser          = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading   = (state) => state.auth.loading
export const selectAuthError     = (state) => state.auth.error

export default authSlice.reducer
