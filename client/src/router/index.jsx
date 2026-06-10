// src/router/index.jsx
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '@/features/auth/authSlice'
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
const NotFound     = lazy(() => import('@/pages/NotFound'))

// Route guards
function PrivateRoute({ children }) {
  const isAuth = useSelector(selectIsAuthenticated)
  return isAuth ? children : <Navigate to="/auth/login" replace />
}
function PublicOnly({ children }) {
  const isAuth = useSelector(selectIsAuthenticated)
  return isAuth ? <Navigate to="/dashboard" replace /> : children
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
      { path: 'discover',            element: <Wrap element={<Discover />} /> },
      { path: 'trips',               element: <Wrap element={<MyTrips />} /> },
      { path: 'expenses',            element: <Wrap element={<Expenses />} /> },
      { path: 'analytics',           element: <Wrap element={<Analytics />} /> },
      { path: 'subscription',        element: <Wrap element={<Subscription />} /> },
      { path: 'notifications',       element: <Wrap element={<Notifications />} /> },
      { path: 'profile',             element: <Wrap element={<Profile />} /> },
    ],
  },
  // Top-level discover page (public)
  { path: '/discover', element: <Wrap element={<Discover />} /> },
  { path: '*', element: <Wrap element={<NotFound />} /> },
])
