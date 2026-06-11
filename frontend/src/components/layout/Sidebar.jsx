// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, Compass, Briefcase,
  Receipt, BarChart3, CreditCard, Bell, User, MapPin,
} from 'lucide-react'

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard',    to: '/dashboard' },
  { icon: <Map size={18} />,             label: 'Plan a Trip',  to: '/dashboard/planner' },
  { icon: <Compass size={18} />,         label: 'Discover',     to: '/dashboard/discover' },
  { icon: <Briefcase size={18} />,       label: 'My Trips',     to: '/dashboard/trips' },
  { icon: <MapPin size={18} />,          label: 'Explore Map',  to: '/dashboard/map' },
  { icon: <Receipt size={18} />,         label: 'Expenses',     to: '/dashboard/expenses' },
  { icon: <BarChart3 size={18} />,       label: 'Analytics',    to: '/dashboard/analytics' },
  { icon: <CreditCard size={18} />,      label: 'Subscription', to: '/dashboard/subscription' },
  { icon: <Bell size={18} />,            label: 'Notifications',to: '/dashboard/notifications' },
  { icon: <User size={18} />,            label: 'Profile',      to: '/dashboard/profile' },
]

export default function Sidebar({ isOpen = false }) {
  return (
    <aside
      className={`dashboard-sidebar${isOpen ? ' sidebar-open' : ''}`}
      style={{
        width: 240,
        flexShrink: 0,
        position: 'fixed',
        top: 64,
        left: 0,
        bottom: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
        padding: '1.25rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.125rem',
      }}
    >
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0.875rem', marginBottom: '0.5rem' }}>
        Navigation
      </p>
      {navItems.map(({ icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <span style={{ flexShrink: 0 }}>{icon}</span>
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
