'use client'

import { useRouter } from 'next/navigation'

export default function DevPaywallButton() {
  if (process.env.NODE_ENV === 'production') return null
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.push('/mystatments?paywall=1')}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 99999,
        padding: '8px 12px',
        borderRadius: 999,
        border: '1px solid rgba(95, 74, 62, 0.35)',
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Open Paywall (Dev)
    </button>
  )
}
