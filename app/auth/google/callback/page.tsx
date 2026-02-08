'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'

export default function GoogleCallbackPage() {
  const params = useSearchParams()
  const router = useRouter()
  const { loginWithToken } = useAuth()
  const [message, setMessage] = useState('Signing you in…')

  useEffect(() => {
    const token = params.get('token')
    const next = params.get('next') || '/dashboard'
    if (!token) {
      setMessage('Missing login token. Please try again.')
      return
    }
    ;(async () => {
      try {
        await loginWithToken(token)
        router.replace(next)
      } catch {
        setMessage('Unable to sign in. Please try again.')
      }
    })()
  }, [params, loginWithToken, router])

  return (
    <main style={{ maxWidth: 520, margin: '60px auto', padding: 20, textAlign: 'center' }}>
      <div
        style={{
          borderRadius: 18,
          padding: '22px 20px',
          border: '1px solid rgba(95, 74, 62, 0.2)',
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 16px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 6 }}>
          ManifestBank™
        </div>
        <div style={{ opacity: 0.8 }}>{message}</div>
      </div>
    </main>
  )
}
