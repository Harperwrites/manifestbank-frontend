'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/app/providers'
import InstallAppButton from '@/app/components/InstallAppButton'
import { api } from '@/lib/api'

type AccountItem = {
  id: number
  name?: string
  balance?: number
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

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (treasureRef.current && !treasureRef.current.contains(target)) {
        setTreasureOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTreasureOpen(false)
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
            try {
              const balanceRes = await api.get(`/accounts/${acct.id}/balance?currency=USD`)
              return { id: acct.id, balance: Number(balanceRes.data?.balance ?? 0) }
            } catch {
              return { id: acct.id, balance: 0 }
            }
          })
        )
        const balanceMap = new Map(balances.map((item) => [item.id, item.balance]))
        setAccounts(
          list.map((acct: any) => ({
            id: acct.id,
            name: acct.name,
            balance: balanceMap.get(acct.id) ?? 0,
          }))
        )
        setAccountsLoaded(true)
      })
      .catch((e) => setAccountsMsg(e?.response?.data?.detail ?? e?.message ?? 'Failed to load accounts'))
      .finally(() => setAccountsLoading(false))
  }, [showAccountsDropdown, accountsOpen, accountsLoaded, accountsLoading])

  function formatMoney(value: any) {
    const num = Number(value)
    if (Number.isNaN(num)) return value ?? ''
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
  }

  return (
    <>
      <div
        className="mb-navbar"
        style={{
          position: sticky ? 'fixed' : 'relative',
          top: sticky ? 0 : 'auto',
          left: sticky ? 0 : 'auto',
          right: sticky ? 0 : 'auto',
          zIndex: sticky ? 200 : 'auto',
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
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 10,
                              fontSize: 13,
                              paddingBottom: 6,
                              borderBottom: '1px solid rgba(95, 74, 62, 0.12)',
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{account.name}</div>
                            <div style={{ opacity: 0.8 }}>{formatMoney(account.balance)}</div>
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
        <div ref={treasureRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setTreasureOpen((open) => !open)}
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
              className="treasure-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                minWidth: 200,
                borderRadius: 12,
                border: '1px solid rgba(95, 74, 62, 0.2)',
                background: '#ffffff',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
                padding: 10,
                display: 'grid',
                gap: 8,
                zIndex: 1000,
              }}
              role="menu"
            >
              <Link
                href="/myjournal"
                style={{ textDecoration: 'none', fontWeight: 600, color: 'rgba(95, 74, 62, 0.9)' }}
                role="menuitem"
                onClick={() => setTreasureOpen(false)}
              >
                My Journal
              </Link>
            </div>
          ) : null}
        </div>
        {isLoading ? (
          <span style={{ opacity: 0.75 }}>Loading…</span>
        ) : me ? (
          <>
            <span style={{ opacity: 0.9 }}>
              Signed in as <b>{me.email}</b>
            </span>
          </>
        ) : (
          <Link href="/auth" style={{ textDecoration: 'none' }}>
            Login
          </Link>
        )}
        </div>
      </div>
      {sticky ? <div className="mb-navbar-spacer" /> : null}
    </>
  )
}
