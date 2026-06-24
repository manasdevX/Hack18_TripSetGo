import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'

const plannerGlassPanelClass = 'bg-[rgba(26,31,47,0.7)] backdrop-blur-[40px] border border-solid border-[rgba(255,255,255,0.08)] border-t-[rgba(255,255,255,0.12)] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

export default function BudgetBar({ liveBudget, totalBudget, status }) {
  const pct = totalBudget > 0 ? Math.min((liveBudget / totalBudget) * 100, 100) : 0
  const colors = { green: '#10b981', amber: '#f59e0b', red: '#ef4444', neutral: '#0EA5E9' }
  const color  = colors[status] || colors.neutral
  const remaining = totalBudget - liveBudget

  return (
    <div className={plannerGlassPanelClass} style={{ padding: '1.25rem 1.5rem', borderRadius: 16, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `rgba(${color === '#10b981' ? '16,185,129' : color === '#f59e0b' ? '245,158,11' : color === '#ef4444' ? '239,68,68' : '14,165,233'}, 0.15)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <TrendingUp size={16} style={{ color }} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Live Budget Tracker</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Real-time spend tracking</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 800, fontSize: '1.25rem', color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{inr(liveBudget)}</p>
          <p style={{ fontSize: '0.75rem', color: remaining >= 0 ? 'var(--color-text-muted)' : '#ef4444' }}>
            {remaining >= 0 ? `${inr(remaining)} remaining` : `${inr(Math.abs(remaining))} over budget`}
          </p>
        </div>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            height: '100%', borderRadius: 99,
            background: `linear-gradient(90deg, ${color}, ${color}99)`,
            boxShadow: `0 0 8px ${color}66`
          }}
          className={remaining < 0 ? 'animate-pulse' : ''}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>₹0</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Total: {inr(totalBudget)}</p>
      </div>
    </div>
  )
}
