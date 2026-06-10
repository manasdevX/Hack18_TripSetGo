// src/components/layout/DashboardLayout.jsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function DashboardLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Navbar />
      <div style={{ display: 'flex', paddingTop: 64 }}>
        <Sidebar />
        <main style={{
          flex: 1,
          marginLeft: 240,
          padding: '2rem',
          minHeight: 'calc(100vh - 64px)',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
