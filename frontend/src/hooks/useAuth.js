// src/hooks/useAuth.js
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  selectUser, selectIsAuthenticated, selectAuthLoading, selectAuthError,
  login, logout, signup, verifyOTP, fetchMe, clearError,
} from '@/features/auth/authSlice'

export function useAuth() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user          = useSelector(selectUser)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading       = useSelector(selectAuthLoading)
  const error         = useSelector(selectAuthError)

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login:    (data) => dispatch(login(data)),
    logout:   async () => { await dispatch(logout()); navigate('/auth/login') },
    signup:   (data) => dispatch(signup(data)),
    verifyOTP: (data) => dispatch(verifyOTP(data)),
    fetchMe:  ()     => dispatch(fetchMe()),
    clearError: ()   => dispatch(clearError()),
  }
}
