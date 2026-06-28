// src/components/common/Modal.jsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Modal({ isOpen, onClose, title, children, size = 'md', hideClose = false }) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const maxWidths = { sm: 400, md: 560, lg: 720, xl: 900, full: '95vw' }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto' }}>
          {/* Backdrop Background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: -1,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
            }}
          />

          {/* Centering Scroll Wrapper */}
          <div
            style={{
              display: 'flex',
              minHeight: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0 }}
              exit={{ scale: 0.95,    opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-bg-glass backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "modal-title" : undefined}
              style={{
                width: '100%',
                maxWidth: maxWidths[size] || 560,
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                position: 'relative',
              }}
            >
              {(title || !hideClose) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  {title && <h2 id="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>}
                  {!hideClose && (
                    <button
                      onClick={onClose}
                      className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ marginLeft: 'auto', borderRadius: '50%', padding: '0.375rem' }}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
