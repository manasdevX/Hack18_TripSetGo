// src/components/common/Input.jsx
import { forwardRef } from 'react'

const Input = forwardRef(function Input(
  { label, error, helperText, icon, iconRight, type = 'text', className = '', id, required, ...props },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {label}{required && <span style={{ color: 'var(--color-accent-red)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <span style={{ position: 'absolute', left: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', pointerEvents: 'none' }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`input ${error ? 'input-error' : ''} ${className}`}
          style={{ paddingLeft: icon ? '2.5rem' : undefined, paddingRight: iconRight ? '2.5rem' : undefined }}
          {...props}
        />
        {iconRight && (
          <span style={{ position: 'absolute', right: '0.75rem', color: 'var(--color-text-muted)', display: 'flex' }}>
            {iconRight}
          </span>
        )}
      </div>
      {error     && <span style={{ fontSize: '0.8125rem', color: 'var(--color-accent-red)' }}>{error}</span>}
      {helperText && !error && <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{helperText}</span>}
    </div>
  )
})

export default Input
