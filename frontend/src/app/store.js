// src/app/store.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer         from '@/features/auth/authSlice'
import plannerReducer      from '@/features/planner/plannerSlice'
import tripsReducer        from '@/features/trips/tripsSlice'
import discoverReducer     from '@/features/discover/discoverSlice'
import notificationsReducer from '@/features/notifications/notificationsSlice'
import subscriptionReducer from '@/features/subscription/subscriptionSlice'

const store = configureStore({
  reducer: {
    auth:          authReducer,
    planner:       plannerReducer,
    trips:         tripsReducer,
    discover:      discoverReducer,
    notifications: notificationsReducer,
    subscription:  subscriptionReducer,
  },
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
