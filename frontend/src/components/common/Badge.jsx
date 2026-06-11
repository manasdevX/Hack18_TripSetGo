// src/components/common/Badge.jsx
const variantMap = { primary: 'badge-primary', green: 'badge-green', amber: 'badge-amber', red: 'badge-red', cyan: 'badge-cyan' }
export default function Badge({ label, variant = 'primary', icon, className = '' }) {
  return (
    <span className={`badge ${variantMap[variant] || 'badge-primary'} ${className}`}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  )
}
