// src/components/layout/Navbar.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, ChevronDown, LogOut, User, Settings, CreditCard, Menu } from 'lucide-react'
import Avatar from '@/components/common/Avatar'
import { selectUser, selectIsAuthenticated, logout } from '@/features/auth/authSlice'
import { selectUnreadCount } from '@/features/notifications/notificationsSlice'

export default function Navbar({ onMenuClick }) {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(selectUser)
  const isAuth    = useSelector(selectIsAuthenticated)
  const unread    = useSelector(selectUnreadCount)
  const [dropOpen, setDropOpen] = useState(false)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/auth/login')
  }

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
      height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 1.5rem',
      background: 'rgba(10,15,30,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {/* Hamburger — only in dashboard (when onMenuClick provided), mobile only via CSS */}
      {onMenuClick && (
        <button
          className="flex items-center justify-center p-1.5 bg-[rgba(99,102,241,0.15)] border border-solid border-[rgba(99,102,241,0.25)] rounded-md text-text-primary cursor-pointer mr-1 max-md:!flex md:hidden"
          onClick={onMenuClick}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 no-underline">
        <img src="/favicon.svg" className="w-8 h-8 object-contain" alt="TripSetGo Logo" />
        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-xl tracking-tighter">
          Trip<span className="bg-gradient-primary bg-clip-text text-transparent">SetGo</span>
        </span>
      </Link>

      {/* Nav links (Stripted out per design guidelines) */}

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isAuth ? (
          <>
            {/* User dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setDropOpen(!dropOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}
              >
                <Avatar src={user?.avatar} name={user?.name} size="sm" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} color="var(--color-text-muted)" />
              </button>
              {dropOpen && (
                <div className="bg-bg-glass backdrop-blur-[20px] border border-solid border-border shadow-card animate-fadeIn" style={{
                  position: 'absolute', top: '110%', right: 0,
                  width: 200, borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  zIndex: 100,
                  transformOrigin: 'top right'
                }}>
                  <div style={{ padding: '0.5rem 0.75rem 0.75rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{user?.name}</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                  </div>
                  
                  {/* Exactly 2 Dropdown options: Profile & Logout */}
                  <Link to="/dashboard/profile" onClick={() => setDropOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.875rem', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                  >
                    <User size={15} /> Profile
                  </Link>

                  <button
                    onClick={() => { setDropOpen(false); handleLogout(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-red)', fontSize: '0.875rem', transition: 'all 0.15s', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/auth/login" className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-transparent text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary">Sign In</Link>
            <Link to="/auth/signup" className="inline-flex items-center justify-center gap-2 font-sans font-semibold text-[0.8125rem] px-[0.875rem] py-[0.375rem] rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:bg-right hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:translate-y-0 active:scale-[0.98] active:shadow-btn">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  )
}
