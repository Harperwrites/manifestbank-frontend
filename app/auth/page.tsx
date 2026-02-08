'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const { loginWithToken } = useAuth()
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001'

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setLoading(true)

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setMsg('❌ Passwords do not match')
          setLoading(false)
          return
        }
        if (!acceptTerms) {
          setMsg('❌ You must accept the Terms & Conditions and Privacy Policy.')
          setLoading(false)
          return
        }
        await api.post('/auth/register', { email, password, username, accept_terms: true })
        setMsg('✅ Account created. Check your email to verify and unlock full access.')
        setMode('login')
      } else {
        const res = await api.post('/auth/login', { identifier: email, password })
        const token = res.data?.access_token
        if (!token) throw new Error('No access_token in response')

        await loginWithToken(token)
        setMsg('✅ Logged in.')
        router.push('/dashboard')
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        err?.message ??
        'Something went wrong'
      setMsg(`❌ ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault()
    setResetMsg('')
    if (!resetEmail) {
      setResetMsg('❌ Email is required.')
      return
    }
    try {
      await api.post('/auth/password-reset/request', { email: resetEmail })
      setResetMsg('✅ Check your email for a reset link.')
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ??
        err?.response?.data?.message ??
        err?.message ??
        'Something went wrong'
      setResetMsg(`❌ ${detail}`)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '4px auto', padding: 16 }}>
      <div
        style={{
          padding: '16px 20px 24px',
          borderRadius: 24,
          border: '1px solid var(--border)',
          background: 'var(--paper)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: -64 }}>
          <img
            src="/manifestbank-trademark-logo.png"
            alt="ManifestBank™"
            style={{
              maxWidth: 560,
              width: '140%',
              height: 'auto',
              display: 'block',
              marginLeft: -72,
              transform: 'translateY(-4px)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <p style={{ opacity: 0.75, margin: '-18px 0 20px' }}>
          {mode === 'login' ? 'Enter your private vault.' : 'Establish your vault access.'}
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setAcceptTerms(false)
            }}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 999,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              background: mode === 'login' ? 'rgba(182, 121, 103, 0.18)' : 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register')
              setAcceptTerms(false)
            }}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 999,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              background: mode === 'register' ? 'rgba(182, 121, 103, 0.18)' : 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Register
          </button>
        </div>

        <a
          href={`${apiBase}/auth/google/start?next=/dashboard`}
          style={{
            display: 'inline-flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '10px 16px',
            borderRadius: 999,
            border: '1px solid #dadce0',
            background: '#fff',
            color: '#3c4043',
            textDecoration: 'none',
            fontWeight: 600,
            marginBottom: 12,
            gap: 8,
            boxShadow: '0 1px 2px rgba(60, 64, 67, 0.08)',
            fontFamily: 'var(--font-sans)',
            position: 'relative',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 48 48"
            aria-hidden="true"
            style={{ display: 'block' }}
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.2 0 6.1 1.1 8.4 3l6.3-6.3C34.9 2.6 29.8 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.4 5.8C11.5 13.2 17.3 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.1 24.6c0-1.6-.1-2.8-.4-4H24v7.6h12.4c-.6 3-2.3 5.5-4.8 7.2l7.4 5.8c4.3-4 7.1-9.9 7.1-16.6z"
            />
            <path
              fill="#FBBC05"
              d="M9.9 28.7c-1-3-1-6.2 0-9.2l-7.4-5.8c-3.2 6.3-3.2 13.7 0 20l7.4-5z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.5 0 12-2.1 16-5.8l-7.4-5.8c-2.1 1.4-4.9 2.3-8.6 2.3-6.7 0-12.5-3.7-15.1-9.2l-7.4 5.8C6.5 42.6 14.6 48 24 48z"
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          >
            Continue with Google
          </span>
        </a>

        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>{mode === 'login' ? 'Email or username' : 'Email address'}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="text"
              inputMode="email"
              placeholder="me@wealth.com"
              required
              autoComplete={mode === 'login' ? 'username' : 'email'}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'rgba(255, 255, 255, 0.9)',
                color: 'inherit',
              }}
            />
          </label>

          {mode === 'register' ? (
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                placeholder="wealthbuilder"
                required
                minLength={3}
                autoComplete="username"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'inherit',
                }}
              />
            </label>
          ) : null}

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'rgba(255, 255, 255, 0.9)',
                color: 'inherit',
              }}
            />
          </label>

          {mode === 'register' ? (
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Confirm password</span>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'inherit',
                }}
              />
            </label>
          ) : null}

          {mode === 'register' ? (
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
                style={{ marginTop: 3 }}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" style={{ textDecoration: 'underline', color: 'inherit' }}>
                  Terms &amp; Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" style={{ textDecoration: 'underline', color: 'inherit' }}>
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 12,
              borderRadius: 999,
              border: '1px solid rgba(182, 121, 103, 0.6)',
              background: 'linear-gradient(135deg, #c88a77, #b67967)',
              color: '#fff',
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
              fontWeight: 600,
            }}
          >
            {loading ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        {msg && <p style={{ marginTop: 14, whiteSpace: 'pre-wrap' }}>{msg}</p>}

        <button
          type="button"
          onClick={() => {
            setResetOpen(true)
            setResetEmail(email)
            setResetMsg('')
          }}
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 999,
            border: '1px solid rgba(95, 74, 62, 0.35)',
            background: 'transparent',
            cursor: 'pointer',
            width: '100%',
            fontWeight: 600,
          }}
        >
          Forgot password?
        </button>
      </div>

      {resetOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(18, 12, 10, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483646,
            padding: 20,
          }}
          onClick={() => setResetOpen(false)}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
              borderRadius: 20,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              padding: 20,
              color: '#2f1f1a',
              boxShadow:
                '0 24px 60px rgba(60, 42, 35, 0.35), 0 10px 26px rgba(0, 0, 0, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              Reset password
            </div>
            <div style={{ opacity: 0.7, marginTop: 4 }}>
              We’ll email you a secure reset link.
            </div>
            <form onSubmit={submitReset} style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <input
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.3)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 13,
                }}
              />
              {resetMsg ? <div style={{ fontSize: 12 }}>{resetMsg}</div> : null}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setResetOpen(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 999,
                    border: '1px solid rgba(95, 74, 62, 0.35)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: '1px solid rgba(182, 121, 103, 0.6)',
                    background: 'linear-gradient(135deg, #c88a77, #b67967)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Reset password
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
