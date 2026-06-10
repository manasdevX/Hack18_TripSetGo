// src/pages/Dashboard/Notifications.jsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Bell, CheckCheck } from 'lucide-react'
import { fetchNotifications, markRead, markAllRead, selectNotifications, selectUnreadCount } from '@/features/notifications/notificationsSlice'
import Button from '@/components/common/Button'

export default function Notifications() {
  const dispatch   = useDispatch()
  const items      = useSelector(selectNotifications)
  const unread     = useSelector(selectUnreadCount)

  useEffect(() => { dispatch(fetchNotifications()) }, [dispatch])

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            <span className="gradient-text">Notifications</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" icon={<CheckCheck size={15} />} onClick={() => dispatch(markAllRead())}>
            Mark all read
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Bell size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No notifications</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((n, i) => (
            <motion.div key={n._id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => !n.isRead && dispatch(markRead(n._id))}
              className="card"
              style={{ cursor: n.isRead ? 'default' : 'pointer', opacity: n.isRead ? 0.65 : 1, borderLeft: n.isRead ? undefined : '3px solid var(--color-accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: n.isRead ? 400 : 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>{n.message}</p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-primary)', flexShrink: 0, marginTop: 6 }} />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
