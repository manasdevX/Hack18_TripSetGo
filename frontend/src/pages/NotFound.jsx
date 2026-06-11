// src/pages/NotFound.jsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-hero)', textAlign: 'center', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ fontSize: '8rem', fontWeight: 900, lineHeight: 1 }} className="gradient-text">404</p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Page Not Found</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>The destination you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary">
          <ArrowLeft size={16} /> Go Home
        </Link>
      </motion.div>
    </div>
  )
}
