// src/pages/Dashboard/Expenses.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Receipt, Users, Calculator } from 'lucide-react'
import Button from '@/components/common/Button'

// Placeholder — full implementation uses groups/expenses Redux slice
export default function Expenses() {
  const [expenses] = useState([
    { id: 1, title: 'Hotel', amount: 12000, paidBy: 'Alice', splitAmong: ['Alice', 'Bob', 'Carol'], category: 'accommodation' },
    { id: 2, title: 'Dinner at Beach Shack', amount: 3200, paidBy: 'Bob', splitAmong: ['Alice', 'Bob', 'Carol'], category: 'food' },
    { id: 3, title: 'Taxi to Airport', amount: 1800, paidBy: 'Carol', splitAmong: ['Alice', 'Bob', 'Carol'], category: 'transport' },
  ])
  const members = ['Alice', 'Bob', 'Carol']
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  // Settlements: very simple per-person balance
  const balances = {}
  members.forEach(m => balances[m] = 0)
  expenses.forEach(e => {
    const share = e.amount / e.splitAmong.length
    balances[e.paidBy] += e.amount
    e.splitAmong.forEach(m => { balances[m] -= share })
  })

  const categoryColors = { accommodation: '#6366f1', food: '#10b981', transport: '#06b6d4', entertainment: '#f59e0b', misc: '#8b5cf6' }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Group <span className="gradient-text">Expenses</span></h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Splitwise-style expense tracking</p>
        </div>
        <Button icon={<Plus size={15} />} size="sm">Add Expense</Button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Spent',  value: `₹${total.toLocaleString()}`, icon: <Receipt size={20} />,    color: '#6366f1' },
          { label: 'Participants', value: members.length,                icon: <Users size={20} />,      color: '#06b6d4' },
          { label: 'Per Person',   value: `₹${(total / members.length).toLocaleString()}`, icon: <Calculator size={20} />, color: '#10b981' },
        ].map(stat => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, background: `${stat.color}20`, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>{stat.icon}</div>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>{stat.label}</p>
              <p style={{ fontWeight: 800, fontSize: '1.125rem' }}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Expense list */}
        <div>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Expenses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {expenses.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${categoryColors[e.category] || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {e.category === 'food' ? '🍽️' : e.category === 'accommodation' ? '🏨' : e.category === 'transport' ? '🚗' : '💰'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{e.title}</p>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Paid by {e.paidBy} • Split {e.splitAmong.length} ways</p>
                    </div>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '1rem' }}>₹{e.amount.toLocaleString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Settlements */}
        <div>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Settlements</h2>
          <div className="card">
            {members.map(m => (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 500 }}>{m}</span>
                <span style={{ fontWeight: 700, color: balances[m] > 0 ? 'var(--color-accent-green)' : balances[m] < 0 ? 'var(--color-accent-red)' : 'var(--color-text-muted)' }}>
                  {balances[m] > 0 ? `+₹${balances[m].toFixed(0)}` : balances[m] < 0 ? `-₹${Math.abs(balances[m]).toFixed(0)}` : '✓ settled'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
