// src/components/common/Button.jsx
const sizeMap = {
  sm: 'px-[0.875rem] py-[0.375rem] text-[0.8125rem]',
  md: '',
  lg: 'px-[1.75rem] py-[0.875rem] text-base rounded-lg',
}
const variantMap = {
  primary: 'bg-gradient-primary bg-[length:200%_auto] text-white shadow-btn hover:not-disabled:bg-right hover:not-disabled:-translate-y-0.5 hover:not-disabled:scale-[1.02] hover:not-disabled:shadow-[0_6px_20px_rgba(129,140,248,0.5)] active:not-disabled:translate-y-0 active:not-disabled:scale-[0.98] active:not-disabled:shadow-btn',
  secondary: 'bg-transparent text-text-primary border border-solid border-border hover:not-disabled:border-accent-primary hover:not-disabled:bg-[rgba(99,102,241,0.1)]',
  ghost: 'bg-transparent text-text-secondary hover:not-disabled:bg-[rgba(255,255,255,0.05)] hover:not-disabled:text-text-primary',
  danger: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-solid border-[rgba(239,68,68,0.3)] hover:not-disabled:bg-[rgba(239,68,68,0.25)]',
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
      className={`inline-flex items-center justify-center gap-2 font-sans font-semibold text-sm px-5 py-2.5 rounded-xl border-none cursor-pointer transition-all duration-250 ease-out whitespace-nowrap text-decoration-none relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed ${variantMap[variant] || ''} ${sizeMap[size] || ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin" aria-hidden="true" style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
      ) : (
        icon && <span className="inline-flex items-center justify-center" aria-hidden="true">{icon}</span>
      )}
      {children}
      {iconRight && !loading && <span className="inline-flex items-center justify-center" aria-hidden="true">{iconRight}</span>}
    </button>
  )
}

