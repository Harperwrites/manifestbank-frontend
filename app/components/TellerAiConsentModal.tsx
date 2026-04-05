'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

type TellerAiConsentModalProps = {
  open: boolean
  onAccept: () => void
  onExit: () => void
}

export default function TellerAiConsentModal({ open, onAccept, onExit }: TellerAiConsentModalProps) {
  const [checked, setChecked] = useState(false)
  const [draft, setDraft] = useState('')
  const [mounted, setMounted] = useState(false)

  const canContinue = useMemo(() => checked && /^accept$/i.test(draft.trim()), [checked, draft])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!open || !mounted) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 12, 8, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(620px, 100%)',
          background:
            'linear-gradient(145deg, rgba(195, 134, 116, 0.98), rgba(238, 221, 209, 0.98)), radial-gradient(circle at 14% 18%, rgba(255,255,255,0.55), transparent 42%)',
          borderRadius: 24,
          border: '1px solid rgba(95, 74, 62, 0.3)',
          padding: '22px 22px 20px',
          color: '#2b1b16',
          boxShadow: '0 28px 70px rgba(0,0,0,0.38), 0 0 32px rgba(182, 121, 103, 0.18)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600 }}>
          AI Experience Notice
        </div>
        <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65 }}>
          <p style={{ margin: '0 0 10px' }}>
            ManifestBank™ uses advanced AI systems to generate insights, reflections, and responses.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            Some interactions may be processed by third-party AI providers to improve system intelligence and
            performance.
          </p>
          <p style={{ margin: 0 }}>
            Please do not enter sensitive, confidential, or personal information, including health data or
            private financial details.
          </p>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.58)',
            border: '1px solid rgba(95, 74, 62, 0.16)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          By continuing, you acknowledge and agree to this processing.
        </div>

        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            marginTop: 16,
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            style={{ marginTop: 4 }}
          />
          <span>I understand and agree.</span>
        </label>

        <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
          <label htmlFor="teller-ai-accept" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Type Accept to continue
          </label>
          <input
            id="teller-ai-accept"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Accept"
            style={{
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.22)',
              padding: '11px 12px',
              fontSize: 14,
              background: 'rgba(255,255,255,0.8)',
              color: '#2b1b16',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={onExit}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid rgba(95, 74, 62, 0.28)',
              background: 'rgba(255,255,255,0.58)',
              color: '#4a2f26',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Exit
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              if (!canContinue) return
              onAccept()
              setChecked(false)
              setDraft('')
            }}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: '1px solid rgba(182, 121, 103, 0.6)',
              background: 'linear-gradient(135deg, #c88a77, #b67967)',
              color: '#fff',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              fontWeight: 700,
              opacity: canContinue ? 1 : 0.6,
              boxShadow: '0 0 18px rgba(182, 121, 103, 0.22)',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
