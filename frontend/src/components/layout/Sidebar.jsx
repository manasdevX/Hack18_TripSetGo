// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, logout } from '@/features/auth/authSlice'
import {
  LayoutDashboard, Map, Compass, Briefcase,
  Receipt, BarChart3, CreditCard, Bell, User, MapPin,
  Users, MessageSquare, Terminal, LogOut, Globe
} from 'lucide-react'

const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard',    to: '/dashboard' },
  { icon: <Map size={18} />,             label: 'Plan a Trip',  to: '/dashboard/planner' },
  { icon: <Compass size={18} />,         label: 'Discover',     to: '/dashboard/discover' },
  { icon: <Globe size={18} />,           label: 'Explore Hub',  to: '/dashboard/explore' },
  { icon: <Briefcase size={18} />,       label: 'My Trips',     to: '/dashboard/trips' },
  { icon: <MapPin size={18} />,          label: 'Explore Map',  to: '/dashboard/map' },
  { icon: <Receipt size={18} />,         label: 'Expenses',     to: '/dashboard/expenses' },
  { icon: <BarChart3 size={18} />,       label: 'Analytics',    to: '/dashboard/analytics' },
  { icon: <CreditCard size={18} />,      label: 'Subscription', to: '/dashboard/subscription' },
  { icon: <Bell size={18} />,            label: 'Notifications',to: '/dashboard/notifications' },
  { icon: <User size={18} />,            label: 'Profile',      to: '/dashboard/profile' },
]

const adminNavItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Overview',     to: '/dashboard/admin' },
  { icon: <Users size={18} />,           label: 'Users',        to: '/dashboard/admin/users' },
  { icon: <MessageSquare size={18} />,   label: 'Reviews',      to: '/dashboard/admin/reviews' },
  { icon: <MapPin size={18} />,          label: 'Destinations', to: '/dashboard/admin/destinations' },
  { icon: <Terminal size={18} />,        label: 'Audit Logs',   to: '/dashboard/admin/reports' },
]

export default function Sidebar({ isOpen = false }) {
  const user = useSelector(selectUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/auth/login')
  }

  return (
    <aside
      className={`w-[240px] min-w-[240px] flex-shrink-0 fixed top-16 left-0 bottom-0 overflow-y-auto overflow-x-hidden bg-bg-secondary border-r border-solid border-border p-[1.25rem_0.75rem] flex flex-col gap-1 transition-transform duration-300 ease-out z-50 -translate-x-full md:translate-x-0 ${isOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]' : ''}`}
    >
      <p className="shrink-0 text-[0.6875rem] font-bold tracking-[0.08em] uppercase px-3.5 mb-2 mt-1" style={{ color: 'var(--color-text-muted)' }}>
        Navigation
      </p>
      {navItems.map(({ icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          className={({ isActive }) =>
            `shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl no-underline text-sm border border-transparent transition-all duration-150 relative ` +
            (isActive
              ? 'font-semibold text-text-primary bg-linear-to-r from-[rgba(129,140,248,0.15)] to-transparent border-[rgba(129,140,248,0.3)] ' +
                "after:content-[''] after:absolute after:left-0 after:top-[15%] after:h-[70%] after:w-1 after:bg-gradient-primary after:rounded-r after:shadow-[0_0_10px_rgba(129,140,248,0.8)]"
              : 'font-normal text-text-secondary bg-transparent hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary hover:border-[rgba(99,102,241,0.1)]')
          }
        >
          <span className="shrink-0 inline-flex">{icon}</span>
          {label}
        </NavLink>
      ))}

      {isAdmin && (
        <>
          <p className="shrink-0 text-[0.6875rem] font-bold tracking-[0.08em] uppercase px-3.5 mt-6 mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Admin Console
          </p>
          {adminNavItems.map(({ icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard/admin'}
              className={({ isActive }) =>
                `shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl no-underline text-sm border border-transparent transition-all duration-150 relative ` +
                (isActive
                  ? 'font-semibold text-text-primary bg-linear-to-r from-[rgba(129,140,248,0.15)] to-transparent border-[rgba(129,140,248,0.3)] ' +
                    "after:content-[''] after:absolute after:left-0 after:top-[15%] after:h-[70%] after:w-1 after:bg-gradient-primary after:rounded-r after:shadow-[0_0_10px_rgba(129,140,248,0.8)]"
                  : 'font-normal text-text-secondary bg-transparent hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary hover:border-[rgba(99,102,241,0.1)]')
              }
            >
              <span className="shrink-0 inline-flex">{icon}</span>
              {label}
            </NavLink>
          ))}
        </>
      )}

      {/* Logout Action Button at the bottom of sidebar */}
      <button
        onClick={handleLogout}
        className="shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm border border-transparent transition-all duration-150 relative font-medium text-accent-red bg-transparent cursor-pointer w-full mt-auto hover:bg-red-500/8 hover:border-red-500/15"
      >
        <span className="inline-flex shrink-0"><LogOut size={18} /></span>
        Logout
      </button>
    </aside>
  )
}
