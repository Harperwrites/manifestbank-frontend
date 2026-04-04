'use client'

import { createPortal } from 'react-dom'
import { PREMIUM_TIER_NAME } from '@/app/lib/premium'

export default function TierComparisonModal({
  open,
  onClose,
  onOpenPaywall,
  reason,
}: {
  open: boolean
  onClose: () => void
  onOpenPaywall: () => void
  reason?: string
}) {
  if (!open) return null
  if (typeof document === 'undefined') return null

  const features = [
    { label: 'Wealth Builder account', free: true, freeNote: '', signature: true, sigNote: '' },
    { label: 'Additional accounts', free: false, freeNote: '', signature: true, sigNote: 'Unlimited' },
    { label: 'Checks', free: true, freeNote: '1 per 7 days', signature: true, sigNote: 'Unlimited' },
    { label: 'Deposits + expenses', free: true, freeNote: '2 + 2 per 7 days', signature: true, sigNote: 'Unlimited' },
    { label: 'Affirmation entries', free: true, freeNote: '10 total', signature: true, sigNote: 'Unlimited' },
    { label: 'Saved affirmations', free: false, freeNote: 'Not included', signature: true, sigNote: 'Unlimited' },
    { label: 'Statements', free: false, freeNote: 'Not included', signature: true, sigNote: 'Full access' },
    { label: 'Credit points per login', free: true, freeNote: '1 point', signature: true, sigNote: '2 points' },
    { label: 'Daily credit points cap', free: true, freeNote: '2 points', signature: true, sigNote: '5 points' },
    { label: 'My Teller', free: false, freeNote: 'Not included', signature: true, sigNote: 'Included' },
    { label: 'Beta access', free: false, freeNote: 'Not included', signature: true, sigNote: 'First in line for Beta releases' },
    { label: 'Currency flexibility', free: false, freeNote: 'Not included', signature: true, sigNote: 'Change your currency across supported features' },
  ]

  const handleFreeClick = () => {
    onClose()
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('auth:logged_out', { detail: { message: 'Free account active.', persist: true } })
        )
      }, 50)
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      className="mb-tier-comparison-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 10, 12, 0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 2147483646,
        padding: '18px 18px 28px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mb-tier-comparison-modal"
        style={{
          width: 'min(920px, 100%)',
          marginTop: 12,
          marginBottom: 24,
          maxHeight: 'calc(100vh - 36px)',
          overflowY: 'auto',
          borderRadius: 24,
          background:
            'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(236, 214, 201, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%)',
          border: '1px solid rgba(95, 74, 62, 0.3)',
          boxShadow: '0 26px 68px rgba(12, 10, 12, 0.35)',
          color: '#2c1a14',
          padding: 22,
        }}
      >
        <style>{`
          @keyframes mb-glisten {
            0% { transform: translateX(-140%) rotate(25deg); opacity: 0; }
            30% { opacity: 0.9; }
            60% { opacity: 0.35; }
            100% { transform: translateX(260%) rotate(25deg); opacity: 0; }
          }
          @media (max-width: 640px) {
            .mb-tier-comparison-overlay {
              padding: 10px 10px 18px !important;
            }
            .mb-tier-comparison-modal {
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              max-height: calc(100vh - 20px) !important;
              border-radius: 18px !important;
              padding: 14px !important;
            }
            .mb-tier-comparison-modal .mb-tier-header {
              align-items: flex-start !important;
            }
            .mb-tier-comparison-modal .mb-tier-title {
              font-size: 18px !important;
              line-height: 1.2 !important;
            }
            .mb-tier-comparison-modal .mb-tier-grid {
              grid-template-columns: 1fr !important;
              gap: 12px !important;
            }
            .mb-tier-comparison-modal .mb-tier-actions {
              justify-content: stretch !important;
            }
            .mb-tier-comparison-modal .mb-tier-actions > * {
              width: 100% !important;
            }
            .mb-tier-comparison-modal .mb-tier-secondary {
              justify-items: stretch !important;
            }
          }
        `}</style>
        <div className="mb-tier-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div className="mb-tier-title" style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700 }}>
            Choose Your ManifestBank Path
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.7 }}
          >
            Close
          </button>
        </div>

        {reason ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              fontWeight: 700,
              color: '#7a4b3e',
              textShadow: '0 0 8px rgba(182, 121, 103, 0.55), 0 0 16px rgba(182, 121, 103, 0.35)',
            }}
          >
            {reason}
          </div>
        ) : null}

        <div
          className="mb-tier-grid"
          style={{
            marginTop: 18,
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          <button
            type="button"
            data-testid="tier-free-button"
            onClick={handleFreeClick}
            style={{
              backgroundColor: 'rgba(247,243,237,0.92)',
              backgroundImage:
                'linear-gradient(rgba(247,243,237,0.72), rgba(247,243,237,0.72)), url("/marble-veins.png")',
              backgroundSize: '205%',
              backgroundPosition: '12% 10%',
              borderRadius: 18,
              padding: 16,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'grid', gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Free</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>$0</div>
              <div style={{ fontSize: 11, opacity: 0.72, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Start with the essentials
              </div>
            </div>
            <ul style={{ marginTop: 10, display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
              {features.map((item) => (
                <li key={`free-${item.label}`} style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: item.free ? '#2f6b3f' : '#7a2e2e' }}>
                    {item.free ? '✓' : '✕'}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.4 }}>
                    {item.label}
                    {item.freeNote ? ` — ${item.freeNote}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </button>

          <button
            type="button"
            data-testid="tier-signature-button"
            onClick={onOpenPaywall}
            style={{
              backgroundColor: 'rgba(243,238,232,0.94)',
              backgroundImage:
                'linear-gradient(rgba(243,238,232,0.58), rgba(243,238,232,0.58)), url("/marble-veins.png")',
              backgroundSize: '235%',
              backgroundPosition: '8% 6%',
              borderRadius: 18,
              padding: 16,
              border: '1px solid rgba(95, 74, 62, 0.28)',
              boxShadow: '0 22px 42px rgba(12, 10, 12, 0.24), 0 0 24px rgba(182, 121, 103, 0.18)',
              textAlign: 'left',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 72,
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.12) 58%, rgba(255,255,255,0))',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 2 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{PREMIUM_TIER_NAME}</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>*as low as $6/month</div>
              <div style={{ fontSize: 11, opacity: 0.72, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Built for expanded access
              </div>
            </div>
            <ul style={{ position: 'relative', zIndex: 1, marginTop: 10, display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
              {features.map((item) => (
                <li
                  key={`sig-${item.label}`}
                  style={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 8 }}
                >
                  <span style={{ fontWeight: 700, color: '#2f6b3f' }}>✓</span>
                  <span style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                    {item.label}
                    {item.sigNote ? ` — ${item.sigNote}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </button>
        </div>

        <div
          className="mb-tier-actions"
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onOpenPaywall}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(135deg, #b67967, #c6927c)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 12px 26px rgba(12, 10, 12, 0.22)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: '-40%',
                left: '-30%',
                width: '60%',
                height: '180%',
                transform: 'rotate(25deg)',
                background: 'linear-gradient(120deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))',
                animation: 'mb-glisten 2.8s ease-in-out infinite',
              }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>View Signature Options</span>
          </button>
          <div className="mb-tier-secondary" style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
            <div
              style={{
                fontSize: 11,
                opacity: 0.8,
                color: '#7a4b3e',
                textShadow: '0 0 8px rgba(182, 121, 103, 0.55), 0 0 16px rgba(182, 121, 103, 0.35)',
              }}
            >
              Not ready yet?
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'rgba(255,255,255,0.85)',
                color: '#4a2f25',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'grid',
                gap: 2,
                justifyItems: 'center',
              }}
            >
              <span>Maybe next time</span>
              <span style={{ fontSize: 10, opacity: 0.75 }}>(come back soon)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
