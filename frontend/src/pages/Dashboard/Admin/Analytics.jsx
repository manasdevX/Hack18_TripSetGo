// src/pages/Dashboard/Admin/Analytics.jsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAnalytics, selectAdmin } from '@/features/admin/adminSlice'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts'
import { Users, Compass, CreditCard, ShieldAlert } from 'lucide-react'
import Loader from '@/components/common/Loader'

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6']

export default function AdminAnalytics() {
  const dispatch = useDispatch()
  const { analytics, loading, error } = useSelector(selectAdmin)

  useEffect(() => {
    dispatch(fetchAnalytics())
  }, [dispatch])

  if (loading && !analytics) {
    return <Loader fullScreen text="Loading Admin Dashboard..." />
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#ef4444' }}>
        <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Denied</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
      </div>
    )
  }

  if (!analytics) return null

  const { stats, trends } = analytics

  // Prepare chart data
  const combinedTrend = trends.signups.map(item => {
    const tripItem = trends.trips.find(t => t._id === item._id)
    const reviewItem = trends.reviews.find(r => r._id === item._id)
    return {
      date: item._id,
      Signups: item.count,
      Trips: tripItem ? tripItem.count : 0,
      Reviews: reviewItem ? reviewItem.count : 0
    }
  })

  return (
    <div className="page-enter">
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Admin <span className="gradient-text">Console</span></h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Platform analytics & operations control desk</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {/* Users Stats */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.users.total}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Total Users ({stats.users.active} Active)</p>
          </div>
        </div>

        {/* Trips Stats */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
            <Compass size={24} />
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.trips.total}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Total Trips ({stats.trips.public} Shared)</p>
          </div>
        </div>

        {/* Destinations Stats */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Compass size={24} />
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats.destinations.total}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Destinations ({stats.destinations.attractions} Attractions)</p>
          </div>
        </div>

        {/* Subscriptions Stats */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <CreditCard size={24} />
          </div>
          <div>
            <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>₹{Number(stats.subscriptions.estimatedMonthlyRevenue || 0).toLocaleString('en-IN')}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Est. Monthly Revenue ({stats.subscriptions.active} Pros)</p>
          </div>
        </div>
      </div>

      {/* Main Trends & Popular Destinations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Trend Area Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Platform Activity (Last 7 Days)</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={combinedTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="Signups" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSignups)" />
                <Area type="monotone" dataKey="Trips" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTrips)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Destinations Bar Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Popular Searched Destinations</h3>
          {trends.popularDestinations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, color: 'var(--color-text-muted)' }}>
              <Compass size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No destination search data collected yet</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={trends.popularDestinations} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="_id" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {trends.popularDestinations.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Database Quick Distribution */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Inventory Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Hotels</h4>
            <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#6366f1' }}>{stats.destinations.hotels}</p>
          </div>
          <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Restaurants</h4>
            <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#06b6d4' }}>{stats.destinations.restaurants}</p>
          </div>
          <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Attractions</h4>
            <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#10b981' }}>{stats.destinations.attractions}</p>
          </div>
          <div style={{ background: 'var(--color-bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
            <h4 style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Total Reviews</h4>
            <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: '#f59e0b' }}>{stats.reviews.total}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
