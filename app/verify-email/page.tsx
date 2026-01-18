'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'
import { Button, Card } from '@/app/components/ui'

function VerifyEmailContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { me } = useAuth()
  const token = params.get('token')
  const nextPath = params.get('next') || '/dashboard'
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    setStatus('verifying')
    setMessage('')
    api
      .get('/auth/verify-email', { params: { token } })
      .then((res) => {
        if (res.data?.status === 'verified' || res.data?.status === 'already_verified') {
          setStatus('verified')
          setMessage('✅ Email verified. You can now access full ManifestBank features.')
        } else {
          setStatus('error')
          setMessage('Verification failed. Please request a new link.')
        }
      })
      .catch((err: any) => {
        const detail =
          err?.response?.data?.detail ??
          err?.response?.data?.message ??
          err?.message ??
          'Verification failed.'
        setStatus('error')
        setMessage(`❌ ${detail}`)
      })
  }, [token])

  useEffect(() => {
    if (status !== 'verified' && !me?.email_verified) return
    setRedirectCountdown(2)
    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null) return prev
        const next = prev - 1
        return next < 0 ? 0 : next
      })
    }, 1000)
    const timer = window.setTimeout(() => {
      router.push(nextPath)
    }, 2200)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timer)
    }
  }, [status, me?.email_verified, nextPath, router])

  async function resend() {
    setResending(true)
    setMessage('')
    try {
      const res = await api.post('/auth/verify-email/resend')
      if (res.data?.status === 'sent') {
        setMessage('✅ Verification email sent. Check your inbox.')
      } else if (res.data?.status === 'already_verified') {
        setMessage('✅ Email already verified.')
      } else {
        setMessage('✅ Verification email sent.')
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        err?.message ??
        'Could not resend email.'
      setMessage(`❌ ${detail}`)
    } finally {
      setResending(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '90px auto', padding: 24 }}>
      <Card title="Verify your email" tone="soft">
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
          Verify your email to unlock deposits, transfers, and The Ether.
        </div>
        {token ? (
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            {status === 'verifying' ? 'Checking your link…' : message || 'Processing verification…'}
          </div>
        ) : (
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            No verification link detected. You can request a new one below.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="solid" onClick={() => router.push(nextPath)}>
            Continue
          </Button>
          {status !== 'verified' && !me?.email_verified ? (
            <Button variant="outline" onClick={resend} disabled={resending || !me}>
              {resending ? 'Sending…' : 'Resend verification email'}
            </Button>
          ) : null}
          {status === 'verified' || me?.email_verified ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Redirecting{redirectCountdown !== null ? ` in ${redirectCountdown}s` : '…'}
            </span>
          ) : null}
        </div>
        {!me && status !== 'verified' ? (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Log in first to resend a verification email.
          </div>
        ) : null}
      </Card>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 520, margin: '90px auto', padding: 24 }}>Loading…</main>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
