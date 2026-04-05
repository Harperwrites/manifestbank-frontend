'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/app/providers'
import InstallAppButton from '@/app/components/InstallAppButton'
import MyAffirmationsIcon from '@/app/components/MyAffirmationsIcon'
import MyJournalIcon from '@/app/components/MyJournalIcon'
import MyChecksSignatureIcon from '@/app/components/MyChecksSignatureIcon'
import MyStatementsIcon from '@/app/components/MyStatementsIcon'
import { api } from '@/lib/api'
import { PREMIUM_CTA } from '@/app/lib/premium'
import { validateUsername } from '@/app/lib/username'

type AccountItem = {
  id: number
  name?: string
  balance?: number
  currency?: string | null
}

export default function Navbar({
  showAccountsDropdown = false,
  sticky = true,
}: {
  showAccountsDropdown?: boolean
  sticky?: boolean
}) {
  const router = useRouter()
  const { me, isLoading } = useAuth()
  const [accountsOpen, setAccountsOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const accountsRef = useRef<HTMLDivElement | null>(null)
  const accountsMenuRef = useRef<HTMLDivElement | null>(null)
  const [accountsMenuRect, setAccountsMenuRect] = useState<DOMRect | null>(null)
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [accountsLoaded, setAccountsLoaded] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsMsg, setAccountsMsg] = useState('')
  const [treasureOpen, setTreasureOpen] = useState(false)
  const treasureRef = useRef<HTMLDivElement | null>(null)
  const treasureMenuRef = useRef<HTMLDivElement | null>(null)
  const [treasureMenuRect, setTreasureMenuRect] = useState<DOMRect | null>(null)
  const isPremium = Boolean(me?.is_premium || me?.role === 'admin')
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const [usernameModalOpen, setUsernameModalOpen] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [usernameScopeConfirmed, setUsernameScopeConfirmed] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        treasureRef.current &&
        !treasureRef.current.contains(target) &&
        (!treasureMenuRef.current || !treasureMenuRef.current.contains(target))
      ) {
        setTreasureOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTreasureOpen(false)
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  useEffect(() => {
    if (!showAccountsDropdown) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        accountsRef.current &&
        !accountsRef.current.contains(target) &&
        (!accountsMenuRef.current || !accountsMenuRef.current.contains(target))
      ) {
        setAccountsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showAccountsDropdown])

  useEffect(() => {
    if (!showAccountsDropdown || !accountsOpen) return
    if (accountsLoaded || accountsLoading) return
    setAccountsLoading(true)
    setAccountsMsg('')
    api
      .get('/accounts')
      .then(async (res) => {
        const list = Array.isArray(res.data) ? res.data : []
        const balances = await Promise.all(
          list.map(async (acct: any) => {
            const currency = (acct.currency || 'USD').toUpperCase()
            try {
              const balanceRes = await api.get(`/accounts/${acct.id}/balance?currency=${currency}`)
              return { id: acct.id, balance: Number(balanceRes.data?.balance ?? 0), currency }
            } catch {
              return { id: acct.id, balance: 0, currency }
            }
          })
        )
        const balanceMap = new Map(balances.map((item) => [item.id, item]))
        setAccounts(
          list.map((acct: any) => ({
            id: acct.id,
            name: acct.name,
            balance: balanceMap.get(acct.id)?.balance ?? 0,
            currency: balanceMap.get(acct.id)?.currency ?? (acct.currency || 'USD'),
          }))
        )
        setAccountsLoaded(true)
      })
      .catch((e) => setAccountsMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load accounts'))
      .finally(() => setAccountsLoading(false))
  }, [showAccountsDropdown, accountsOpen, accountsLoaded, accountsLoading])

  useEffect(() => {
    function handleRefresh() {
      setAccountsLoaded(false)
      setAccountsMsg('')
    }
    window.addEventListener('accounts:refresh', handleRefresh)
    return () => window.removeEventListener('accounts:refresh', handleRefresh)
  }, [])

  function formatMoney(value: any, currency?: string | null) {
    const num = Number(value)
    if (Number.isNaN(num)) return value ?? ''
    const code = (currency || 'USD').toUpperCase()
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(num)
    } catch {
      return `${code} ${num.toFixed(2)}`
    }
  }

  async function openPortal() {
    if (portalLoading) return
    setPortalLoading(true)
    setPortalError('')
    try {
      const res = await api.post('/billing/portal-session')
      const url = res.data?.url
      if (url) {
        window.location.href = url
      } else {
        setPortalError('Unable to open billing portal.')
      }
    } catch (err: any) {
      setPortalError(err?.response?.data?.detail ?? err?.message ?? 'Unable to open billing portal.')
    } finally {
      setPortalLoading(false)
    }
  }

  function queueRefreshToast(message: string) {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem('toast:message', message)
    window.sessionStorage.setItem('toast:persist', '1')
    window.sessionStorage.setItem('scroll:top', '1')
    window.location.reload()
  }

  function openUsernameEditor() {
    setUsernameDraft(me?.username ?? '')
    setUsernameError('')
    setUsernameScopeConfirmed(false)
    setUsernameModalOpen(true)
    setUserMenuOpen(false)
  }

  async function saveUsername() {
    const trimmed = usernameDraft.trim()
    const validation = validateUsername(trimmed)
    if (!validation.ok) {
      setUsernameError(validation.reason ?? 'Enter a valid username.')
      return
    }
    if (!usernameScopeConfirmed) {
      setUsernameError('Confirm that you understand this changes your ManifestBank dashboard username only.')
      return
    }
    setUsernameSaving(true)
    setUsernameError('')
    try {
      await api.patch('/auth/username', { username: trimmed })
      queueRefreshToast('ManifestBank dashboard username updated.')
    } catch (err: any) {
      setUsernameError(err?.response?.data?.detail ?? err?.message ?? 'Unable to update username.')
    } finally {
      setUsernameSaving(false)
    }
  }

  // Keep the treasure menu anchored to the open position without reflow wiggle.

  return (
    <>
      <style>{`
        @keyframes signatureGlow {
          0% { box-shadow: 0 0 12px rgba(198, 146, 124, 0.5), 0 0 24px rgba(182, 121, 103, 0.35); }
          50% { box-shadow: 0 0 22px rgba(214, 165, 143, 0.9), 0 0 44px rgba(182, 121, 103, 0.6); }
          100% { box-shadow: 0 0 12px rgba(198, 146, 124, 0.5), 0 0 24px rgba(182, 121, 103, 0.35); }
        }
        @keyframes signatureShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes mb-glisten {
          0% { transform: translateX(-140%) rotate(25deg); opacity: 0; }
          30% { opacity: 0.9; }
          60% { opacity: 0.35; }
          100% { transform: translateX(260%) rotate(25deg); opacity: 0; }
        }
        .signature-member-btn {
          background: linear-gradient(120deg, #b67967, #e2b9a3, #b67967);
          background-size: 200% 200%;
          animation: signatureGlow 2.8s ease-in-out infinite, signatureShimmer 3.6s ease-in-out infinite;
        }
      `}</style>
      <div
        className="mb-navbar"
        style={{
          position: sticky ? 'fixed' : 'relative',
          top: sticky ? 0 : 'auto',
          left: sticky ? 0 : 'auto',
          right: sticky ? 0 : 'auto',
          zIndex: sticky ? 5000 : 5000,
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          rowGap: 10,
        }}
      >
        <div className="mb-navbar-left" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {showAccountsDropdown ? (
          <div ref={accountsRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setAccountsOpen((open) => {
                  const next = !open
                  if (next && accountsRef.current) {
                    setAccountsMenuRect(accountsRef.current.getBoundingClientRect())
                  }
                  return next
                })
              }}
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                textAlign: 'left',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ManifestBank™
              <span style={{ fontSize: 14, opacity: 0.7 }}>▾</span>
            </button>
            {accountsOpen && portalReady
              ? createPortal(
                  <div
                    ref={accountsMenuRef}
                    style={{
                      position: 'fixed',
                      top: accountsMenuRect?.bottom ? accountsMenuRect.bottom + 8 : 72,
                      left: accountsMenuRect?.left ?? 20,
                      width: 280,
                      borderRadius: 14,
                      border: '1px solid rgba(95, 74, 62, 0.25)',
                      background: '#ffffff',
                      opacity: 1,
                      backdropFilter: 'none',
                      backgroundImage: 'none',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
                      padding: 12,
                      display: 'grid',
                      gap: 10,
                      zIndex: 99999,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Accounts</div>
                    {accountsLoading ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Loading…</div>
                    ) : accountsMsg ? (
                      <div style={{ fontSize: 12, color: '#7a2e2e' }}>{accountsMsg}</div>
                    ) : accounts.length === 0 ? (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>No accounts yet.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {accounts.map((account) => (
                          <div
                            key={account.id}
                            style={{
                              display: 'grid',
                              gap: 4,
                              fontSize: 13,
                              paddingBottom: 8,
                              borderBottom: '1px solid rgba(95, 74, 62, 0.12)',
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{account.name}</div>
                            <div style={{ opacity: 0.85 }}>
                              {formatMoney(account.balance, account.currency)} •{' '}
                              {(account.currency || 'USD').toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        router.push('/dashboard')
                        setAccountsOpen(false)
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(95, 74, 62, 0.25)',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Open Dashboard
                    </button>
                  </div>,
                  document.body
                )
              : null}
          </div>
        ) : (
          <Link
            href="/"
            style={{
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
            }}
          >
            ManifestBank™
          </Link>
        )}
        <InstallAppButton />

        {me?.role === 'admin' && (
          <Link href="/admin" style={{ textDecoration: 'none', opacity: 0.75 }}>
            Admin
          </Link>
        )}
      </div>

      <div className="mb-navbar-right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {!isLoading && isPremium ? (
          <button
            type="button"
            onClick={openPortal}
            className="signature-member-btn"
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              textShadow: '0 0 12px rgba(255, 255, 255, 0.55)',
            }}
          >
            {portalLoading ? 'Opening…' : 'ManifestBank™ Signature Member'}
          </button>
        ) : null}
          {!isLoading && !isPremium ? (
            <button
              type="button"
              onClick={() => {
                if (!me?.email_verified) {
                  window.dispatchEvent(
                    new CustomEvent('toast', {
                      detail: { kind: 'error', message: 'Verify your email to upgrade your membership.' },
                    })
                  )
                  return
                }
                window.dispatchEvent(
                  new CustomEvent('paywall:open', { detail: { reason: 'Upgrade to ManifestBank™ Signature.' } })
                )
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(135deg, #b67967, #c6927c)',
                color: '#fff',
                fontWeight: 700,
                cursor: me?.email_verified ? 'pointer' : 'not-allowed',
                position: 'relative',
                overflow: 'hidden',
                opacity: me?.email_verified ? 1 : 0.6,
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
                  background:
                    'linear-gradient(120deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))',
                  animation: 'mb-glisten 2.8s ease-in-out infinite',
                }}
              />
              <span style={{ position: 'relative', zIndex: 1 }}>{PREMIUM_CTA}</span>
            </button>
          ) : null}
        {portalError ? (
          <div style={{ fontSize: 12, color: '#7a2e2e' }}>{portalError}</div>
        ) : null}
        <div ref={treasureRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() =>
              setTreasureOpen((open) => {
                const next = !open
                if (next && treasureRef.current) {
                  setTreasureMenuRect(treasureRef.current.getBoundingClientRect())
                }
                return next
              })
            }
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 600,
              color: 'rgba(95, 74, 62, 0.9)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textShadow: '0 0 22px rgba(182, 121, 103, 0.8)',
            }}
            aria-haspopup="menu"
            aria-expanded={treasureOpen}
          >
            My Treasure Chest
            <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
          </button>
          {treasureOpen ? (
            <div
              ref={treasureMenuRef}
              className="treasure-menu"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 8,
                minWidth: 200,
                maxWidth: 'calc(100vw - 24px)',
                borderRadius: 12,
                border: '1px solid rgba(140, 92, 78, 0.45)',
                background: 'rgba(252, 245, 240, 1)',
                opacity: 1,
                backdropFilter: 'none',
                backgroundImage: 'none',
                boxShadow: '0 24px 60px rgba(12, 10, 12, 0.4)',
                padding: 10,
                display: 'grid',
                gap: 8,
                zIndex: 200000,
              }}
              role="menu"
            >
              <Link
                href="/myjournal"
                style={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  color: 'rgba(95, 74, 62, 0.9)',
                  textShadow: '0 0 4px rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.2)',
                }}
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, display: 'inline-flex' }}>
                    <MyJournalIcon size={18} />
                  </span>
                  <span>My Journal</span>
                </span>
              </Link>
              <Link
                href="/myaffirmations"
                className="mb-affirmations-link"
                style={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  color: 'rgba(95, 74, 62, 0.9)',
                  textShadow: '0 0 4px rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.2)',
                }}
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, display: 'inline-flex' }}>
                    <MyAffirmationsIcon size={18} />
                  </span>
                  <span>My Affirmations</span>
                </span>
              </Link>
              <Link
                href="/mystatments"
                style={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  color: 'rgba(95, 74, 62, 0.9)',
                  textShadow: '0 0 4px rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.2)',
                }}
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, display: 'inline-flex' }}>
                    <MyStatementsIcon size={18} />
                  </span>
                  <span>My Statements</span>
                </span>
              </Link>
              <Link
                href="/mychecks"
                style={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  color: 'rgba(95, 74, 62, 0.9)',
                  textShadow: '0 0 4px rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.2)',
                }}
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, display: 'inline-flex' }}>
                    <MyChecksSignatureIcon size={18} />
                  </span>
                  <span>My Checks</span>
                </span>
              </Link>
              <Link
                href="/mycredit"
                style={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  color: 'rgba(95, 74, 62, 0.9)',
                  textShadow: '0 0 4px rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.2)',
                }}
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, display: 'inline-flex' }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                      <path
                        d="M4.5 16a7.5 7.5 0 0 1 15 0"
                        fill="rgba(182, 121, 103, 0.18)"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path d="M7.2 14.2 8.6 12.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
                      <path d="M12 12v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
                      <path d="m16.8 14.2-1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
                      <path d="M12 16 16.2 12.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="12" cy="16" r="1.65" fill="currentColor" />
                      <path d="M6.8 16h10.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.38" />
                    </svg>
                  </span>
                  <span>My Credit</span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.98), rgba(211, 164, 144, 0.98))',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      boxShadow: '0 0 10px rgba(182, 121, 103, 0.3)',
                      fontStyle: 'italic',
                    }}
                  >
                    New
                  </span>
                </span>
              </Link>
              <Link
                href="/myteller"
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
                style={{
                  textDecoration: 'none',
                  fontWeight: 600,
                  color: 'rgba(95, 74, 62, 0.9)',
                  textShadow: '0 0 4px rgba(182, 121, 103, 0.25), 0 0 10px rgba(182, 121, 103, 0.2)',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 16, height: 16, display: 'inline-flex' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                      <path d="M3 9L12 4l9 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6 10v7M9 10v7M12 10v7M15 10v7M18 10v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>My Teller</span>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.98), rgba(211, 164, 144, 0.98))',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      boxShadow: '0 0 10px rgba(182, 121, 103, 0.3)',
                      fontStyle: 'italic',
                    }}
                  >
                    Beta
                  </span>
                </span>
              </Link>
            </div>
          ) : null}
        </div>
        {isLoading ? (
          <span style={{ opacity: 0.75 }}>Loading…</span>
        ) : me ? (
          <div ref={userMenuRef} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            <span style={{ opacity: 0.9 }}>
              Signed in as <b>{me.username ?? me.email}</b>
            </span>
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-label="Account menu"
              style={{
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                color: 'rgba(95, 74, 62, 0.9)',
              }}
            >
              ☰
            </button>
            {userMenuOpen ? (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  width: 200,
                  borderRadius: 14,
                  border: '1px solid rgba(182, 121, 103, 0.35)',
                  background: 'linear-gradient(180deg, rgba(245, 234, 223, 0.98), rgba(230, 207, 192, 0.98))',
                  boxShadow: '0 18px 42px rgba(26, 18, 14, 0.2)',
                  padding: 12,
                  display: 'grid',
                  gap: 10,
                  zIndex: 100000,
                }}
              >
                <button
                  type="button"
                  onClick={openUsernameEditor}
                  data-testid="navbar-username-open"
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                    color: '#6f4a3a',
                  }}
                >
                  Edit username
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            Login
          </Link>
        )}
        </div>
      </div>
      {usernameModalOpen && portalReady
        ? createPortal(
            <div
              onClick={() => setUsernameModalOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(21, 16, 12, 0.55)',
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
                  position: 'relative',
                  width: 'min(520px, 100%)',
                  background: 'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98))',
                  borderRadius: 22,
                  border: '1px solid rgba(95, 74, 62, 0.25)',
                  padding: 24,
                  boxShadow: '0 20px 44px rgba(14, 10, 8, 0.28)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                  ManifestBank Dashboard Username
                </div>
                <div style={{ opacity: 0.8, marginTop: 8 }}>
                  This name appears in your ManifestBank dashboard only. It does not change your Ether display name.
                </div>
                <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                  <input
                    data-testid="dashboard-username-input"
                    value={usernameDraft}
                    onChange={(e) => setUsernameDraft(e.target.value)}
                    placeholder="yourname"
                    maxLength={21}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.95)',
                      fontSize: 13,
                    }}
                  />
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, opacity: 0.82 }}>
                    <input
                      data-testid="dashboard-username-confirm"
                      type="checkbox"
                      checked={usernameScopeConfirmed}
                      onChange={(e) => setUsernameScopeConfirmed(e.target.checked)}
                      style={{ marginTop: 2 }}
                    />
                    <span>
                      I understand this changes my ManifestBank dashboard username only. It will be visible in the
                      dashboard and sign-in identity, and it will not change my Ether name.
                    </span>
                  </label>
                  {usernameError ? <div style={{ fontSize: 12, color: '#7a2e2e' }}>{usernameError}</div> : null}
                </div>
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    data-testid="dashboard-username-save"
                    onClick={saveUsername}
                    disabled={usernameSaving}
                    style={{
                      borderRadius: 999,
                      border: 'none',
                      background: 'linear-gradient(135deg, #b67967, #c6927c)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: usernameSaving ? 'default' : 'pointer',
                      padding: '10px 16px',
                      opacity: usernameSaving ? 0.7 : 1,
                    }}
                  >
                    {usernameSaving ? 'Saving…' : 'Save Dashboard Username'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {sticky ? <div className="mb-navbar-spacer" /> : null}
    </>
  )
}
