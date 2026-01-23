import React from 'react'

/** Container */
export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '28px 22px 48px',
      }}
    >
      {children}
    </div>
  )
}

/** Card */
export function Card({
  title,
  subtitle,
  children,
  right,
  tone = 'default',
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
  tone?: 'default' | 'soft' | 'deep'
}) {
  const tones: Record<string, React.CSSProperties> = {
    default: {
      background: 'var(--paper)',
      border: '1px solid var(--border)',
      color: 'var(--ink)',
      boxShadow: 'var(--shadow-soft)',
    },
    soft: {
      background: 'var(--paper-strong)',
      border: '1px solid rgba(95, 74, 62, 0.18)',
      color: 'var(--ink)',
      boxShadow: 'var(--shadow-soft)',
    },
    deep: {
      background: 'rgba(40, 30, 24, 0.9)',
      border: '1px solid rgba(246, 241, 234, 0.15)',
      color: 'var(--marble-ivory)',
      boxShadow: 'var(--shadow)',
    },
  }

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 20,
        ...(tones[tone] ?? tones.default),
      }}
    >
      {title ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 18, fontFamily: 'var(--font-serif)' }}>{title}</div>
            {subtitle ? <div style={{ marginTop: 4, fontSize: 12, opacity: 0.7 }}>{subtitle}</div> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}

      {children}
    </div>
  )
}

/** Button */
export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'solid' | 'ghost' | 'danger' | 'outline' | 'outlineLight'
  type?: 'button' | 'submit'
}) {
  const base: React.CSSProperties = {
    borderRadius: 999,
    padding: '10px 16px',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.2,
    transition: 'transform 120ms ease, box-shadow 120ms ease',
  }

  const stylesByVariant: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #c88a77, #b67967)',
      color: '#fff',
      border: '1px solid rgba(182, 121, 103, 0.6)',
      boxShadow: '0 12px 24px rgba(182, 121, 103, 0.3)',
    },
    solid: {
      background: 'linear-gradient(135deg, #c88a77, #b67967)',
      color: '#fff',
      border: '1px solid rgba(182, 121, 103, 0.6)',
      boxShadow: '0 12px 24px rgba(182, 121, 103, 0.3)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--ink)',
      border: '1px solid rgba(95, 74, 62, 0.35)',
    },
    outlineLight: {
      background: 'rgba(255, 255, 255, 0.2)',
      color: 'var(--marble-ivory)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      boxShadow: '0 12px 22px rgba(12, 10, 12, 0.3)',
    },
    ghost: { background: 'transparent', color: 'var(--ink)', border: '1px solid transparent' },
    danger: {
      background: '#b24c4c',
      color: '#fff',
      border: '1px solid #b24c4c',
      boxShadow: '0 12px 24px rgba(178, 76, 76, 0.3)',
    },
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...(stylesByVariant[variant] ?? stylesByVariant.primary) }}
    >
      {children}
    </button>
  )
}

/** Pill */
export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid rgba(95, 74, 62, 0.35)',
        background: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        opacity: 0.9,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/** Metric */
export function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(95, 74, 62, 0.25)',
        borderRadius: 20,
        padding: 16,
        background: 'var(--paper-strong)',
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, marginTop: 6, fontFamily: 'var(--font-serif)' }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>{hint}</div> : null}
    </div>
  )
}
