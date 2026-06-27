// src/hooks/useSocket.js
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import { addSocketNotification } from '@/features/notifications/notificationsSlice'
import { selectUser, selectIsAuthenticated } from '@/features/auth/authSlice'

let socketInstance = null

export function useSocket() {
  const dispatch = useDispatch()
  const user     = useSelector(selectUser)
  const isAuth   = useSelector(selectIsAuthenticated)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!isAuth || !user?._id) return

    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        withCredentials: true,
        transports: ['websocket'],
      })
    }
    socketRef.current = socketInstance

    socketInstance.on('connect', () => {
      const token = localStorage.getItem('accessToken')
      socketInstance.emit('join', { user_id: user._id, token })
    })

    socketInstance.on('notification', (data) => {
      dispatch(addSocketNotification(data))
    })

    socketInstance.on('itinerary:completed', (data) => {
      dispatch({ type: 'planner/setPlan', payload: { plan: data.planData, tripId: data.tripId } })
    })

    socketInstance.on('itinerary:failed', (data) => {
      dispatch({ type: 'planner/generateFailed', payload: data.error })
    })

    return () => {
      socketInstance?.off('notification')
      socketInstance?.off('itinerary:completed')
      socketInstance?.off('itinerary:failed')
    }
  }, [isAuth, user?._id, dispatch])

  return socketInstance
}
