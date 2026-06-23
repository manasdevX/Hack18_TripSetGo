// src/app/store.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer         from '@/features/auth/authSlice'
import plannerReducer      from '@/features/planner/plannerSlice'
import tripsReducer        from '@/features/trips/tripsSlice'
import discoverReducer     from '@/features/discover/discoverSlice'
import notificationsReducer from '@/features/notifications/notificationsSlice'
import subscriptionReducer from '@/features/subscription/subscriptionSlice'
import adminReducer        from '@/features/admin/adminSlice'
import expensesReducer     from '@/features/expenses/expensesSlice'

import { combineReducers } from '@reduxjs/toolkit'

const appReducer = combineReducers({
  auth:          authReducer,
  planner:       plannerReducer,
  trips:         tripsReducer,
  discover:      discoverReducer,
  notifications: notificationsReducer,
  subscription:  subscriptionReducer,
  admin:         adminReducer,
  expenses:      expensesReducer,
})

const rootReducer = (state, action) => {
  if (action.type === 'auth/logout/fulfilled' || action.type === 'auth/logout') {
    state = undefined
  }
  return appReducer(state, action)
}

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['planner/setPlan'],
        ignoredPaths: ['planner.plan'],
      },
    }),
})

export default store
