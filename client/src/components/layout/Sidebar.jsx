// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, Compass, Briefcase,
  Receipt, BarChart3, CreditCard, Bell, User,
} from 'lucide-react'

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard',    to: '/dashboard' },
  { icon: <Map size={18} />,             label: 'Plan a Trip',  to: '/dashboard/planner' },
  { icon: <Compass size={18} />,         label: 'Discover',     to: '/dashboard/discover' },
  { icon: <Briefcase size={18} />,       label: 'My Trips',     to: '/dashboard/trips' },
  { icon: <Receipt size={18} />,         label: 'Expenses',     to: '/dashboard/expenses' },
  { icon: <BarChart3 size={18} />,       label: 'Analytics',    to: '/dashboard/analytics' },
  { icon: <CreditCard size={18} />,      label: 'Subscription', to: '/dashboard/subscription' },
  { icon: <Bell size={18} />,            label: 'Notifications',to: '/dashboard/notifications' },
  { icon: <User size={18} />,            label: 'Profile',      to: '/dashboard/profile' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 240,
      flexShrink: 0,
      position: 'fixed',
      top: 64,
      left: 0,
      bottom: 0,
      overflowY: 'auto',
      background: 'var(--color-bg-secondary)',
      borderRight: '1px solid var(--color-border)',
      padding: '1.5rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}>
      {navItems.map(({ icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
            border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
            transition: 'all var(--transition-fast)',
          })}
          onMouseEnter={e => {
            if (!e.currentTarget.style.background.includes('99,102,241,0.12')) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.color = 'var(--color-text-primary)'
            }
          }}
          onMouseLeave={e => {
            if (!e.currentTarget.style.background.includes('99,102,241,0.12')) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-secondary)'
            }
          }}
        >
          <span style={{ opacity: 0.8 }}>{icon}</span>
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
