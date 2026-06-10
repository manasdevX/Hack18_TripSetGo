// src/pages/Auth/Login.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { login, selectAuthLoading, selectAuthError, clearError, setGoogleUser } from '@/features/auth/authSlice'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import api from '@/services/api'

export default function Login() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const loading   = useSelector(selectAuthLoading)
  const error     = useSelector(selectAuthError)
  const [form, setForm]     = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => { return () => dispatch(clearError()) }, [dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await dispatch(login(form))
    if (!res.error) navigate('/dashboard')
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/api/v1/auth/google/token', { token: credentialResponse.credential })
      dispatch(setGoogleUser(res.data.data))
      navigate('/dashboard')
    } catch {
      // error handled by interceptor
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      background: 'var(--gradient-hero)',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: 280, height: 280, background: 'rgba(99,102,241,0.1)', borderRadius: '50%', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: 200, height: 200, background: 'rgba(6,182,212,0.08)', borderRadius: '50%', filter: 'blur(60px)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass"
        style={{ width: '100%', maxWidth: 440, padding: '2.5rem', borderRadius: 'var(--radius-xl)', position: 'relative' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: 28 }}>✈️</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.3rem' }}>
              Trip<span className="gradient-text">SetGo</span>
            </span>
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome back</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Sign in to continue planning</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#f87171', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input
            label="Email"
            type="email"
            required
            placeholder="you@email.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            icon={<Mail size={16} />}
          />
          <Input
            label="Password"
            type={showPwd ? 'text' : 'password'}
            required
            placeholder="Your password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            icon={<Lock size={16} />}
            iconRight={
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/auth/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--color-accent-primary)', textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
            Sign In
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', flexShrink: 0 }}>or continue with</span>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {}}
            theme="filled_black"
            shape="rectangular"
            text="signin_with"
            width={360}
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Don't have an account?{' '}
          <Link to="/auth/signup" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign up free</Link>
        </p>
      </motion.div>
    </div>
  )
}
