// src/router/index.jsx
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUser } from '@/features/auth/authSlice'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Loader from '@/components/common/Loader'

// Lazy page imports
const Home         = lazy(() => import('@/pages/Home'))
const Login        = lazy(() => import('@/pages/Auth/Login'))
const Signup       = lazy(() => import('@/pages/Auth/Signup'))
const VerifyOTP    = lazy(() => import('@/pages/Auth/VerifyOTP'))
const ForgotPwd    = lazy(() => import('@/pages/Auth/ForgotPassword'))
const ResetPwd     = lazy(() => import('@/pages/Auth/ResetPassword'))
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const Planner      = lazy(() => import('@/pages/Dashboard/Planner'))
const Discover     = lazy(() => import('@/pages/Dashboard/Discover'))
const MyTrips      = lazy(() => import('@/pages/Dashboard/MyTrips'))
const Expenses     = lazy(() => import('@/pages/Dashboard/Expenses'))
const Analytics    = lazy(() => import('@/pages/Dashboard/Analytics'))
const Subscription = lazy(() => import('@/pages/Dashboard/Subscription'))
const Notifications = lazy(() => import('@/pages/Dashboard/Notifications'))
const Profile      = lazy(() => import('@/pages/Dashboard/Profile'))
const MapPage      = lazy(() => import('@/pages/Dashboard/Map'))
const Explore      = lazy(() => import('@/pages/Dashboard/Explore'))
const Copilot      = lazy(() => import('@/pages/Dashboard/Copilot'))
const TripDetail   = lazy(() => import('@/pages/TripDetail'))
const NotFound     = lazy(() => import('@/pages/NotFound'))

// Admin views
const AdminAnalytics    = lazy(() => import('@/pages/Dashboard/Admin/Analytics'))
const AdminUsers          = lazy(() => import('@/pages/Dashboard/Admin/Users'))
const AdminReviews        = lazy(() => import('@/pages/Dashboard/Admin/Reviews'))
const AdminDestinations   = lazy(() => import('@/pages/Dashboard/Admin/Destinations'))
const AdminReports        = lazy(() => import('@/pages/Dashboard/Admin/Reports'))

// Route guards
function PrivateRoute({ children }) {
  const isAuth = useSelector(selectIsAuthenticated)
  return isAuth ? children : <Navigate to="/auth/login" replace />
}
function PublicOnly({ children }) {
  const isAuth = useSelector(selectIsAuthenticated)
  return isAuth ? <Navigate to="/dashboard" replace /> : children
}
function AdminRoute({ children }) {
  const isAuth = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  if (!isAuth) return <Navigate to="/auth/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

const Wrap = ({ element }) => <Suspense fallback={<Loader fullScreen text="Loading..." />}>{element}</Suspense>

export const router = createBrowserRouter([
  { path: '/', element: <Wrap element={<Home />} /> },
  {
    path: '/auth',
    children: [
      { path: 'login',            element: <Wrap element={<PublicOnly><Login /></PublicOnly>} /> },
      { path: 'signup',           element: <Wrap element={<PublicOnly><Signup /></PublicOnly>} /> },
      { path: 'verify-otp',       element: <Wrap element={<VerifyOTP />} /> },
      { path: 'forgot-password',  element: <Wrap element={<ForgotPwd />} /> },
      { path: 'reset-password',   element: <Wrap element={<ResetPwd />} /> },
    ],
  },
  {
    path: '/dashboard',
    element: <PrivateRoute><DashboardLayout /></PrivateRoute>,
    children: [
      { index: true,                 element: <Wrap element={<Dashboard />} /> },
      { path: 'planner',             element: <Wrap element={<Planner />} /> },
      { path: 'copilot',             element: <Wrap element={<Copilot />} /> },
      { path: 'discover',            element: <Wrap element={<Discover />} /> },
      { path: 'explore',             element: <Wrap element={<Explore />} /> },
      { path: 'trips',               element: <Wrap element={<MyTrips />} /> },
      { path: 'expenses',            element: <Wrap element={<Expenses />} /> },
      { path: 'analytics',           element: <Wrap element={<Analytics />} /> },
      { path: 'subscription',        element: <Wrap element={<Subscription />} /> },
      { path: 'notifications',       element: <Wrap element={<Notifications />} /> },
      { path: 'profile',             element: <Wrap element={<Profile />} /> },
      { path: 'map',                 element: <Wrap element={<MapPage />} /> },
      
      // Admin dashboard sub-routes
      {
        path: 'admin',
        children: [
          { index: true,             element: <Wrap element={<AdminRoute><AdminAnalytics /></AdminRoute>} /> },
          { path: 'users',           element: <Wrap element={<AdminRoute><AdminUsers /></AdminRoute>} /> },
          { path: 'reviews',         element: <Wrap element={<AdminRoute><AdminReviews /></AdminRoute>} /> },
          { path: 'destinations',    element: <Wrap element={<AdminRoute><AdminDestinations /></AdminRoute>} /> },
          { path: 'reports',         element: <Wrap element={<AdminRoute><AdminReports /></AdminRoute>} /> },
        ]
      }
    ],
  },
  // Top-level discover page (public)
  { path: '/discover', element: <Wrap element={<Discover />} /> },
  // Public shared-trip view — resolves share links generated by shareTrip controller
  { path: '/trips/:id', element: <Wrap element={<TripDetail />} /> },
  { path: '*', element: <Wrap element={<NotFound />} /> },
])
