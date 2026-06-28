// src/pages/Auth/Signup.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Mail, Lock, User } from 'lucide-react'
import { signup, selectAuthLoading, selectAuthError, clearError, setPendingEmail } from '@/features/auth/authSlice'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'

export default function Signup() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading  = useSelector(selectAuthLoading)
  const error    = useSelector(selectAuthError)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [localErr, setLocalErr] = useState('')

  useEffect(() => { return () => dispatch(clearError()) }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalErr('')
    if (form.password !== form.confirmPassword) { setLocalErr('Passwords do not match'); return }
    if (form.password.length < 8) { setLocalErr('Password must be at least 8 characters'); return }
    const res = await dispatch(signup({ name: form.name, email: form.email, password: form.password }))
    if (!res.error) {
      dispatch(setPendingEmail(form.email))
      navigate('/auth/verify-otp')
    }
  }

  const displayError = localErr || error

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--gradient-hero)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '15%', right: '15%', width: 280, height: 280, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', filter: 'blur(80px)' }} />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="bg-bg-glass backdrop-blur-[20px] border border-border shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" style={{ width: '100%', maxWidth: 460, padding: '2.5rem', borderRadius: 'var(--radius-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <img src="/favicon.svg" style={{ width: 28, height: 28, objectFit: 'contain' }} alt="TripSetGo Logo" />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.3rem' }}>Trip<span className="bg-gradient-primary bg-clip-text text-transparent">SetGo</span></span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create your account</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Start planning your dream trips today</p>
        </div>

        {displayError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.875rem' }}>
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Full Name"        type="text"     required placeholder="John Doe"          value={form.name}            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}            icon={<User size={16} />} />
          <Input label="Email"            type="email"    required placeholder="you@email.com"     value={form.email}           onChange={e => setForm(p => ({ ...p, email: e.target.value }))}           icon={<Mail size={16} />} />
          <Input label="Password"         type="password" required placeholder="Min. 8 characters" value={form.password}        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}        icon={<Lock size={16} />} />
          <Input label="Confirm Password" type="password" required placeholder="Confirm password"  value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} icon={<Lock size={16} />} />
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: '0.5rem' }}>
            Create Account
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Already have an account?{' '}
          <Link to="/auth/login" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
