// src/components/common/Avatar.jsx
export default function Avatar({ src, name, size = 'md' }) {
  const sizes = { xs: 28, sm: 36, md: 44, lg: 64, xl: 96 }
  const px = sizes[size] || 44
  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'

  return (
    <div
      style={{
        width: px, height: px,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: src ? 'transparent' : 'var(--gradient-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: px * 0.38,
        fontWeight: 700,
        color: 'white',
        border: '2px solid var(--color-border)',
        userSelect: 'none',
      }}
    >
      {src ? (
        <img src={src} alt={name || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
