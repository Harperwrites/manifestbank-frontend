'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      setStatus('Reset link is missing or invalid.')
      return
    }
    if (!password || password !== confirmPassword) {
      setStatus('Passwords do not match.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      await api.post('/auth/password-reset/confirm', { token, new_password: password })
      setStatus('✅ Password updated. You can sign in now.')
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Unable to reset password.'
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top, rgba(220, 193, 179, 0.35), rgba(245, 241, 237, 0.75) 55%, rgba(232, 226, 220, 0.95) 100%)',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          background: 'rgba(255, 255, 255, 0.92)',
          borderRadius: 22,
          padding: 24,
          border: '1px solid rgba(95, 74, 62, 0.2)',
          boxShadow: '0 24px 60px rgba(72, 52, 41, 0.25)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600 }}>
          Reset password
        </div>
        <div style={{ opacity: 0.7, marginTop: 6 }}>
          Create a new password for your ManifestBank account.
        </div>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.3)',
              background: 'rgba(255, 255, 255, 0.9)',
              fontSize: 13,
            }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(95, 74, 62, 0.3)',
              background: 'rgba(255, 255, 255, 0.9)',
              fontSize: 13,
            }}
          />
          {status ? <div style={{ fontSize: 12 }}>{status}</div> : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button
              type="button"
              onClick={() => router.push('/auth')}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Back to login
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid rgba(182, 121, 103, 0.6)',
                background: 'linear-gradient(135deg, #c88a77, #b67967)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
