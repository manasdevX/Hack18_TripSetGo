// src/App.jsx
import { useEffect, useState, useCallback } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { router } from '@/router'
import { fetchMe } from '@/features/auth/authSlice'
import { useSocket } from '@/hooks/useSocket'
import { ToastContainer } from '@/components/common/Toast'
import Loader from '@/components/common/Loader'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Global toast state — lifted here so any component can trigger toasts
// via a custom event: window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }))
function AppContent() {
  const dispatch = useDispatch()
  const token    = localStorage.getItem('accessToken')
  const [booting, setBooting] = useState(!!token)
  const [toasts, setToasts]   = useState([])

  // Restore session on reload
  useEffect(() => {
    if (token) {
      dispatch(fetchMe()).finally(() => setBooting(false))
    }
  }, [dispatch, token])

  // Socket connection
  useSocket()

  // Global toast event listener
  const addToast = useCallback((e) => {
    const { type = 'info', message = '' } = e.detail || {}
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), type, message }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    window.addEventListener('toast', addToast)
    return () => window.removeEventListener('toast', addToast)
  }, [addToast])

  if (booting) return <Loader fullScreen text="Loading TripSetGo..." />

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ErrorBoundary>
  )
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AppContent />
    </GoogleOAuthProvider>
  )
}
