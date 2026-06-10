// src/components/common/Toast.jsx
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

const icons = {
  success: <CheckCircle size={18} color="var(--color-accent-green)" />,
  error:   <XCircle size={18} color="var(--color-accent-red)" />,
  warning: <AlertCircle size={18} color="var(--color-accent-amber)" />,
  info:    <Info size={18} color="var(--color-accent-primary)" />,
}

const borders = {
  success: 'var(--color-accent-green)',
  error:   'var(--color-accent-red)',
  warning: 'var(--color-accent-amber)',
  info:    'var(--color-accent-primary)',
}

export function Toast({ id, type = 'info', message, onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return
    const t = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(t)
  }, [id, duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="glass"
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        borderRadius: 'var(--radius-md)',
        borderLeft: `3px solid ${borders[type]}`,
        minWidth: 300, maxWidth: 440,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {icons[type]}
      <p style={{ flex: 1, fontSize: '0.9rem', lineHeight: 1.4 }}>{message}</p>
      <button onClick={() => onDismiss(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}>
        <X size={16} />
      </button>
    </motion.div>
  )
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <AnimatePresence>
        {toasts.map(t => <Toast key={t.id} {...t} onDismiss={onDismiss} />)}
      </AnimatePresence>
    </div>
  )
}
