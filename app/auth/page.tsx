'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const router = useRouter()
  const { loginWithToken } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        await api.post('/auth/register', { email, password, username })
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
            onClick={() => setMode('login')}
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
            onClick={() => setMode('register')}
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
