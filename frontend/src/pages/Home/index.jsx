// src/pages/Home/index.jsx
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Map, Sparkles, Users, Globe, Star, TrendingUp } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

const features = [
  { icon: <Sparkles size={24} />, title: 'AI-Powered Planning', desc: 'Gemini AI generates personalized itineraries with multiple transport, hotel, and activity options.' },
  { icon: <Map size={24} />,      title: 'Interactive Maps',    desc: 'Visualize your entire trip on Mapbox — from source to destination with route visualization.' },
  { icon: <Users size={24} />,    title: 'Group Travel',        desc: 'Plan group trips with Splitwise-style expense splitting and real-time settlement calculations.' },
  { icon: <Globe size={24} />,    title: 'Social Discover',     desc: 'Browse, like, save and clone public trips from a global community of travellers.' },
  { icon: <Star size={24} />,     title: 'Live Budget Tracker', desc: 'Watch your budget update in real-time as you select transport, hotels, food and activities.' },
  { icon: <TrendingUp size={24} />, title: 'Smart Suggestions', desc: 'Get contextual AI tips — upgrade alerts, budget warnings, and adventure recommendations.' },
]

// Honest product capabilities — no fabricated adoption or rating numbers.
const highlights = [
  { value: 'AI',   label: 'Multi-agent itineraries' },
  { value: 'Live', label: 'Budget tracking' },
  { value: 'Maps', label: 'Route visualization' },
  { value: 'Free', label: 'To start planning' },
]

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Navbar />
      {/* Hero */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '8rem 2rem 4rem',
        background: 'var(--gradient-hero)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div className="animate-float" style={{ position: 'absolute', top: '15%', left: '10%', width: 300, height: 300, background: 'rgba(129, 140, 248, 0.25)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div className="animate-float" style={{ animationDelay: '1.5s', position: 'absolute', bottom: '20%', right: '10%', width: 250, height: 250, background: 'rgba(34, 211, 238, 0.2)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="badge badge-primary" style={{ marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
            ✨ Powered by Gemini AI
          </span>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
          }}>
            Plan Your Dream Trip<br />
            <span className="gradient-text">with AI in Seconds</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', maxWidth: 560, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            TripSetGo uses Gemini AI to generate interactive, personalized travel plans — with live budget tracking, maps, and social discovery.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/auth/signup" className="btn btn-primary btn-lg animate-glow" style={{ position: 'relative' }}>
              Start Planning Free <ArrowRight size={18} />
            </Link>
            <Link to="/discover" className="btn btn-secondary btn-lg glass-hover">
              Explore Trips
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
          style={{ display: 'flex', gap: '3rem', marginTop: '5rem', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          {highlights.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800 }} className="gradient-text">{s.value}</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem' }}>
            Everything You Need to <span className="gradient-text">Travel Smarter</span>
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: 560, margin: '0 auto' }}>
            From AI itinerary generation to group expense splitting, TripSetGo has every feature modern travellers need.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="card card-hover"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <div style={{
                width: 48, height: 48,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent-primary)',
                marginBottom: '1rem',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div className="glass" style={{ maxWidth: 700, margin: '0 auto', padding: '4rem 2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
            Ready to Plan Your Next <span className="gradient-text">Adventure?</span>
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Create your first AI-powered itinerary in under a minute — no credit card needed.
          </p>
          <Link to="/auth/signup" className="btn btn-primary btn-lg">
            Get Started — It's Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: 20 }}>✈️</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1rem' }}>
              Trip<span className="gradient-text">SetGo</span>
            </span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
            © {new Date().getFullYear()} TripSetGo · AI-Powered Travel Planning
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/discover" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', textDecoration: 'none' }}>Discover</Link>
            <Link to="/auth/signup" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', textDecoration: 'none' }}>Sign Up</Link>
            <Link to="/auth/login" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
