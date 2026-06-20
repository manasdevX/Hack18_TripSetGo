// src/features/expenses/expensesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/services/api'

export const fetchGroups = createAsyncThunk('expenses/fetchGroups', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/api/v1/groups')
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load groups')
  }
})

export const fetchGroup = createAsyncThunk('expenses/fetchGroup', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/api/v1/groups/${id}`)
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load group')
  }
})

export const createGroup = createAsyncThunk('expenses/createGroup', async (body, { rejectWithValue }) => {
  try {
    const res = await api.post('/api/v1/groups', body)
    return res.data.data // { group, unresolved }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create group')
  }
})

export const deleteGroup = createAsyncThunk('expenses/deleteGroup', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/api/v1/groups/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete group')
  }
})

export const addMember = createAsyncThunk('expenses/addMember', async ({ groupId, email }, { dispatch, rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/groups/${groupId}/members`, { email })
    dispatch(fetchGroup(groupId))
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add member')
  }
})

export const addExpense = createAsyncThunk('expenses/addExpense', async ({ groupId, ...body }, { dispatch, rejectWithValue }) => {
  try {
    const res = await api.post(`/api/v1/groups/${groupId}/expenses`, body)
    // Refresh detail (balances/settlements) and list rollups from the server.
    dispatch(fetchGroup(groupId))
    dispatch(fetchGroups())
    return res.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add expense')
  }
})

export const deleteExpense = createAsyncThunk('expenses/deleteExpense', async ({ groupId, expenseId }, { dispatch, rejectWithValue }) => {
  try {
    await api.delete(`/api/v1/groups/${groupId}/expenses/${expenseId}`)
    dispatch(fetchGroup(groupId))
    dispatch(fetchGroups())
    return expenseId
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete expense')
  }
})

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: {
    groups: [],
    detail: null, // { group, expenses, balances, settlements, total }
    loadingGroups: false,
    loadingDetail: false,
    submitting: false,
    error: null,
  },
  reducers: {
    clearExpensesError: (state) => { state.error = null },
    clearActiveGroup: (state) => { state.detail = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.pending,   (state) => { state.loadingGroups = true; state.error = null })
      .addCase(fetchGroups.fulfilled, (state, { payload }) => { state.loadingGroups = false; state.groups = payload })
      .addCase(fetchGroups.rejected,  (state, { payload }) => { state.loadingGroups = false; state.error = payload })

      .addCase(fetchGroup.pending,   (state) => { state.loadingDetail = true; state.error = null })
      .addCase(fetchGroup.fulfilled, (state, { payload }) => { state.loadingDetail = false; state.detail = payload })
      .addCase(fetchGroup.rejected,  (state, { payload }) => { state.loadingDetail = false; state.error = payload })

      .addCase(createGroup.pending,   (state) => { state.submitting = true; state.error = null })
      .addCase(createGroup.fulfilled, (state, { payload }) => {
        state.submitting = false
        state.groups.unshift({ ...payload.group, expenseCount: 0, totalSpent: 0 })
      })
      .addCase(createGroup.rejected,  (state, { payload }) => { state.submitting = false; state.error = payload })

      .addCase(deleteGroup.fulfilled, (state, { payload: id }) => {
        state.groups = state.groups.filter((g) => g._id !== id)
        if (state.detail?.group?._id === id) state.detail = null
      })
      .addCase(deleteGroup.rejected,  (state, { payload }) => { state.error = payload })

      .addCase(addMember.pending,    (state) => { state.submitting = true; state.error = null })
      .addCase(addMember.fulfilled,  (state) => { state.submitting = false })
      .addCase(addMember.rejected,   (state, { payload }) => { state.submitting = false; state.error = payload })

      .addCase(addExpense.pending,   (state) => { state.submitting = true; state.error = null })
      .addCase(addExpense.fulfilled, (state) => { state.submitting = false })
      .addCase(addExpense.rejected,  (state, { payload }) => { state.submitting = false; state.error = payload })

      .addCase(deleteExpense.rejected, (state, { payload }) => { state.error = payload })
  },
})

export const { clearExpensesError, clearActiveGroup } = expensesSlice.actions

export const selectGroups        = (state) => state.expenses.groups
export const selectGroupDetail   = (state) => state.expenses.detail
export const selectGroupsLoading = (state) => state.expenses.loadingGroups
export const selectDetailLoading = (state) => state.expenses.loadingDetail
export const selectExpenseSubmitting = (state) => state.expenses.submitting
export const selectExpensesError = (state) => state.expenses.error

export default expensesSlice.reducer
