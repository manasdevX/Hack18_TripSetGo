// src/components/layout/DashboardLayout.jsx
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile nav)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Navbar onMenuClick={() => setSidebarOpen(o => !o)} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div style={{ display: 'flex', paddingTop: 64 }}>
        <Sidebar isOpen={sidebarOpen} />
        <main
          className="dashboard-main"
          style={{
            flex: 1,
            marginLeft: 240,
            padding: '2rem',
            minHeight: 'calc(100vh - 64px)',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
