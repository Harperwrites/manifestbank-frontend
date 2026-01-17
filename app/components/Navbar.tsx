'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import InstallAppButton from '@/app/components/InstallAppButton'

export default function Navbar() {
  const router = useRouter()
  const { me, isLoading, logout } = useAuth()

  return (
    <div
      style={{
        position: 'static',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link
          href="/"
          style={{
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
          }}
        >
          ManifestBank
        </Link>
        <InstallAppButton />

        {me?.role === 'admin' && (
          <Link href="/admin" style={{ textDecoration: 'none', opacity: 0.75 }}>
            Admin
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {isLoading ? (
          <span style={{ opacity: 0.75 }}>Loading…</span>
        ) : me ? (
          <>
            <span style={{ opacity: 0.9 }}>
              Signed in as <b>{me.email}</b>
            </span>

            <button
              type="button"
              onClick={() => {
                logout()
                router.push('/auth')
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            Login
          </Link>
        )}
      </div>
    </div>
  )
}
