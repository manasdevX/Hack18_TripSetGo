// src/pages/Auth/ForgotPassword.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { forgotPassword, selectAuthLoading, selectAuthError } from '@/features/auth/authSlice'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'

export default function ForgotPassword() {
  const dispatch = useDispatch()
  const loading  = useSelector(selectAuthLoading)
  const error    = useSelector(selectAuthError)
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(forgotPassword({ email }))
    if (!res.error) setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--gradient-hero)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass" style={{ width: '100%', maxWidth: 420, padding: '2.5rem', borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔐</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Forgot password?</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {sent ? 'Check your email for a reset OTP.' : "Enter your email and we'll send you a reset OTP."}
        </p>
        {!sent && (
          <>
            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <Input label="Email" type="email" required placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={16} />} />
              <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>Send Reset OTP</Button>
            </form>
          </>
        )}
        {sent && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', color: '#34d399' }}>
            ✅ OTP sent to {email}
          </div>
        )}
        <p style={{ marginTop: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          <Link to="/auth/login" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>← Back to login</Link>
        </p>
      </motion.div>
    </div>
  )
}
