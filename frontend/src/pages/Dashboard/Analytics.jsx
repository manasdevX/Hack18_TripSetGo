// src/pages/Dashboard/Analytics.jsx
import { useSelector } from 'react-redux'
import { selectTrips } from '@/features/trips/tripsSlice'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6']

export default function Analytics() {
  const trips = useSelector(selectTrips)

  // Destination frequency
  const destFreq = {}
  trips.forEach(t => { destFreq[t.destination] = (destFreq[t.destination] || 0) + 1 })
  const destData = Object.entries(destFreq).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6)

  // Budget distribution
  const budgetBrackets = { '<₹10K': 0, '₹10K-30K': 0, '₹30K-60K': 0, '₹60K+': 0 }
  trips.forEach(t => {
    const b = Number(t.budget)
    if (b < 10000)       budgetBrackets['<₹10K']++
    else if (b < 30000)  budgetBrackets['₹10K-30K']++
    else if (b < 60000)  budgetBrackets['₹30K-60K']++
    else                 budgetBrackets['₹60K+']++
  })
  const budgetData = Object.entries(budgetBrackets).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

  const totalBudget = trips.reduce((s, t) => s + Number(t.budget || 0), 0)
  const avgBudget   = trips.length ? Math.round(totalBudget / trips.length) : 0

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ color: '#a5b4fc' }}>{payload[0].name}: <strong>{payload[0].value}</strong></p>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Travel <span className="gradient-text">Analytics</span></h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Insights from your trip history</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Trips',      value: trips.length },
          { label: 'Total Budget',     value: `₹${(totalBudget/1000).toFixed(0)}K` },
          { label: 'Avg Budget',       value: `₹${(avgBudget/1000).toFixed(0)}K` },
          { label: 'Destinations',     value: Object.keys(destFreq).length },
          { label: 'Likes Received',   value: trips.reduce((s, t) => s + (t.likesCount || 0), 0) },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 800 }} className="gradient-text">{s.value}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📊</div>
          <p style={{ fontWeight: 600 }}>No data yet</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Plan some trips to see your analytics!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Bar chart — top destinations */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Top Destinations</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={destData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={customTooltip} />
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {destData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — budget distribution */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Budget Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={budgetData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {budgetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '0.8rem', color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
