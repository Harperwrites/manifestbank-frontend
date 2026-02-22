'use client'

import { createPortal } from 'react-dom'
import { PREMIUM_TIER_NAME, PREMIUM_CTA, PREMIUM_ANNUAL_NOTE, PREMIUM_ANNUAL_PRICE, PREMIUM_MONTHLY_PRICE } from '@/app/lib/premium'

export default function PremiumPaywall({
  open,
  onClose,
  reason,
}: {
  open: boolean
  onClose: () => void
  reason?: string
}) {
  if (!open) return null
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 10, 12, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483646,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 100%)',
          borderRadius: 22,
          background:
            'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%)',
          border: '1px solid rgba(95, 74, 62, 0.25)',
          boxShadow: '0 24px 60px rgba(12, 10, 12, 0.35)',
          padding: 20,
          color: '#2c1a14',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-serif)' }}>
            {PREMIUM_TIER_NAME}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.7 }}
          >
            Close
          </button>
        </div>
        {reason ? <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>{reason}</div> : null}
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>{PREMIUM_ANNUAL_NOTE}</div>
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.8)',
              borderRadius: 16,
              padding: 14,
              border: '1px solid rgba(95, 74, 62, 0.2)',
            }}
          >
            <div style={{ fontWeight: 700 }}>Annual</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{PREMIUM_ANNUAL_PRICE}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>$6/mo equivalent</div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.6)',
              borderRadius: 16,
              padding: 14,
              border: '1px solid rgba(95, 74, 62, 0.2)',
            }}
          >
            <div style={{ fontWeight: 700 }}>Monthly</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{PREMIUM_MONTHLY_PRICE}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 18px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #b67967, #c6927c)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 12px 24px rgba(12, 10, 12, 0.25)',
            }}
          >
            {PREMIUM_CTA}
          </button>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Paid tier unlocks unlimited transactions, checks, affirmations, and statements.
          </div>
        </div>
      </div>
    </div>
    ,
    document.body
  )
}
