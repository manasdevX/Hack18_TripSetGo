// src/components/common/Button.jsx
const sizeMap = { sm: 'btn-sm', md: '', lg: 'btn-lg' }
const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn ${variantMap[variant] || ''} ${sizeMap[size] || ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
      ) : (
        icon && <span className="btn-icon">{icon}</span>
      )}
      {children}
      {iconRight && !loading && <span className="btn-icon">{iconRight}</span>}
    </button>
  )
}
