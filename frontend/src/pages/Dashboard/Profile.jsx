// src/pages/Dashboard/Profile.jsx
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { selectUser, updateUser } from '@/features/auth/authSlice'
import Avatar from '@/components/common/Avatar'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import { selectTrips } from '@/features/trips/tripsSlice'
import api from '@/services/api'

export default function Profile() {
  const dispatch = useDispatch()
  const user   = useSelector(selectUser)
  const trips  = useSelector(selectTrips)
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const res = await api.put('/api/v1/users/me', { name: form.name, bio: form.bio })
      dispatch(updateUser(res.data.data))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-enter">
      <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '2rem' }}>My <span className="gradient-text">Profile</span></h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Avatar src={user?.avatar} name={user?.name} size="xl" />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>{user?.name}</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{user?.email}</p>
          <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            {[
              { label: 'Trips',     value: trips.length },
              { label: 'Followers', value: user?.followersCount || 0 },
              { label: 'Following', value: user?.followingCount || 0 },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Edit form */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="card">
          <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Edit Profile</h3>
          {saved && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#34d399', fontSize: '0.875rem' }}>✅ Profile updated!</div>}
          {saveError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>⚠️ {saveError}</div>}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Bio</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Tell others about your travel style..."
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
            <Input label="Email" value={user?.email || ''} disabled helperText="Email cannot be changed" />
            <Button type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}>Save Changes</Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
