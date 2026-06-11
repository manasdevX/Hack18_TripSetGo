// src/pages/Auth/ResetPassword.jsx
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { resetPassword, selectAuthLoading, selectAuthError } from '@/features/auth/authSlice'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'

export default function ResetPassword() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const loading  = useSelector(selectAuthLoading)
  const error    = useSelector(selectAuthError)
  const [form, setForm] = useState({ otp: '', password: '', confirmPassword: '' })
  const [localErr, setLocalErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalErr('')
    if (form.password !== form.confirmPassword) { setLocalErr('Passwords do not match'); return }
    const res = await dispatch(resetPassword({ email: params.get('email'), otp: form.otp, newPassword: form.password }))
    if (!res.error) navigate('/auth/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--gradient-hero)' }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass" style={{ width: '100%', maxWidth: 420, padding: '2.5rem', borderRadius: 'var(--radius-xl)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Reset your password</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>Enter the OTP from your email and your new password.</p>
        {(localErr || error) && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.875rem' }}>{localErr || error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="OTP Code" type="text" required placeholder="6-digit OTP" value={form.otp} onChange={e => setForm(p => ({ ...p, otp: e.target.value }))} />
          <Input label="New Password" type="password" required placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} icon={<Lock size={16} />} />
          <Input label="Confirm Password" type="password" required placeholder="Confirm password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} icon={<Lock size={16} />} />
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: '0.5rem' }}>Reset Password</Button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          <Link to="/auth/login" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>← Back to login</Link>
        </p>
      </motion.div>
    </div>
  )
}
