// src/components/common/Loader.jsx
export default function Loader({ size = 'md', fullScreen = false, text }) {
  const sizes = { sm: 20, md: 36, lg: 56 }
  const px = sizes[size] || 36

  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div
        className="animate-spin"
        style={{
          width: px, height: px,
          border: `${size === 'sm' ? 2 : 3}px solid rgba(99,102,241,0.2)`,
          borderTopColor: 'var(--color-accent-primary)',
          borderRadius: '50%',
        }}
      />
      {text && <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(8px)',
      }}>
        {spinner}
      </div>
    )
  }

  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>{spinner}</div>
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div className="skeleton" style={{ height: 180, marginBottom: '1rem', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: 16, width: '50%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: 16, width: '40%' }} />
    </div>
  )
}
