'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../lib/api'
import { Button, Card, Container } from '../../../components/ui'
import { formatLocalDate } from '@/lib/time'
import { useAuth } from '@/app/providers'
import {
  BALANCE_PREVIEW_BODY,
  BALANCE_PREVIEW_CTA,
  BALANCE_PREVIEW_NOTICE,
  BALANCE_PREVIEW_TITLE,
  formatPreviewCountdown,
  getSoonestPreviewExpiry,
  isVisibleToUser,
} from '@/app/lib/balancePreview'

export const runtime = 'edge'

type LedgerEntry = {
  id: number
  account_id: number
  created_by_user_id: number
  direction: 'credit' | 'debit'
  amount: string
  currency: string
  entry_type: string
  status: 'posted' | 'pending' | 'void'
  reference?: string | null
  memo?: string | null
  created_at: string
  preview_expires_at?: string | null
  is_preview_expired?: boolean
  visible_to_user?: boolean
}

type Account = {
  id: number
  name: string
  account_type: string
}

function formatCurrency(amount: string, currency: string) {
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) return amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed)
}

function formatStatus(status: LedgerEntry['status']) {
  if (status === 'posted') return 'posted'
  if (status === 'pending') return 'pending'
  return status
}

function formatEntryType(value: string) {
  if (value === 'deposit') return 'deposit'
  if (value === 'withdrawal') return 'withdrawal'
  if (value === 'scheduled') return 'scheduled'
  return value.replace(/_/g, ' ')
}

export default function AccountActivityPage() {
  const { me } = useAuth()
  const router = useRouter()
  const params = useParams()
  const accountId = Number(params?.id)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [nowTick, setNowTick] = useState(Date.now())
  const isPremium = Boolean(me?.is_premium || me?.role === 'admin')

  useEffect(() => {
    if (!Number.isFinite(accountId)) return
    let active = true
    async function load() {
      setLoading(true)
      setMsg('')
      try {
        const [accountsRes, ledgerRes] = await Promise.all([
          api.get('/accounts'),
          api.get(`/accounts/${accountId}/ledger?limit=200&offset=0`),
        ])
        if (!active) return
        const found = Array.isArray(accountsRes.data)
          ? accountsRes.data.find((item: Account) => item.id === accountId)
          : null
        setAccount(found ?? null)
        setEntries(ledgerRes.data)
      } catch (e: any) {
        if (!active) return
        const detail = e?.response?.data?.detail
        setMsg(detail ?? e?.message ?? 'Unable to load account history.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [accountId])

  const visibleEntries = useMemo(
    () => entries.filter((entry) => !(entry.entry_type === 'scheduled' && entry.status !== 'posted')),
    [entries]
  )
  const hasLockedEntries = visibleEntries.some((entry) => entry.visible_to_user === false)
  const previewStatus = formatPreviewCountdown(getSoonestPreviewExpiry(visibleEntries), nowTick)

  useEffect(() => {
    if (isPremium) return
    const timer = window.setInterval(() => setNowTick(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [isPremium])

  useEffect(() => {
    if (!selectedEntry) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [selectedEntry])

  return (
    <main style={{ minHeight: '100vh' }}>
      <Container>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const last = window.sessionStorage.getItem('dashboard:last_view')
                if (last) {
                  window.sessionStorage.removeItem('dashboard:last_view')
                  router.push(last)
                  return
                }
              }
              router.back()
            }}
          >
            ← Back
          </Button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-serif)' }}>
              Account Activity
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {account
                ? `${account.name} • ${account.account_type}`
                : loading
                ? 'Loading account'
                : 'Account not found'}
            </div>
          </div>
        </div>

        <Card title="All Account History" tone="soft">
          {msg ? <div style={{ fontSize: 12, color: '#7a2e2e', marginBottom: 10 }}>{msg}</div> : null}
          {!isPremium ? (
            <div
              data-testid="balance-preview-history-notice"
              style={{
                marginBottom: 14,
                padding: '14px 16px',
                borderRadius: 18,
                border: '1px solid rgba(168, 131, 102, 0.35)',
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(246,238,231,0.96)), radial-gradient(circle at top left, rgba(201, 161, 122, 0.18), transparent 48%)',
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.68 }}>
                Balance Preview Vault™ 🗝️
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>{BALANCE_PREVIEW_NOTICE}</div>
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#7a4b3e' }}>
                {hasLockedEntries ? 'Balance preview locked' : previewStatus}
              </div>
            </div>
          ) : null}
          {loading ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>Loading entries…</div>
          ) : visibleEntries.length === 0 ? (
            <div style={{ fontSize: 13, opacity: 0.75 }}>No entries yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  data-testid={`activity-entry-${entry.id}`}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    border: '1px solid rgba(95, 74, 62, 0.2)',
                    background: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {entry.visible_to_user === false
                        ? 'Locked'
                        : `${entry.direction === 'debit' ? '-' : '+'}${formatCurrency(entry.amount, entry.currency)}`}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>#{entry.id}</div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                    {formatEntryType(entry.entry_type)} • {formatStatus(entry.status)} •{' '}
                    {formatLocalDate(entry.created_at)}
                  </div>
                  {entry.memo ? (
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, overflowWrap: 'anywhere' }}>
                      {entry.memo}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        {selectedEntry && typeof document !== 'undefined'
          ? createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  height: '100dvh',
                  background: 'rgba(21, 16, 12, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 60,
                  padding: 20,
                }}
                onClick={() => setSelectedEntry(null)}
              >
                <div
                  style={{
                    width: 'min(520px, 100%)',
                    maxHeight: 'min(85vh, 720px)',
                    overflow: 'auto',
                    background:
                      'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
                    borderRadius: 20,
                    border: '1px solid rgba(95, 74, 62, 0.2)',
                    padding: 20,
                    boxShadow: 'var(--shadow)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                      Transaction details
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(null)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: 18,
                        opacity: 0.7,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ marginTop: 14, display: 'grid', gap: 10, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Amount</div>
                      <div data-testid="activity-entry-amount" style={{ fontWeight: 600 }}>
                        {selectedEntry.visible_to_user === false
                          ? 'Locked'
                          : `${selectedEntry.direction === 'debit' ? '-' : '+'}${formatCurrency(selectedEntry.amount, selectedEntry.currency)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Type</div>
                      <div style={{ fontWeight: 600 }}>{formatEntryType(selectedEntry.entry_type)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Status</div>
                      <div style={{ fontWeight: 600 }}>{formatStatus(selectedEntry.status)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Date</div>
                      <div style={{ fontWeight: 600 }}>
                        {formatLocalDate(selectedEntry.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Reference</div>
                      <div style={{ fontWeight: 600 }}>{selectedEntry.reference || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Memo</div>
                      <div style={{ fontWeight: 600, textAlign: 'right', maxWidth: '65%', overflowWrap: 'anywhere' }}>
                        {selectedEntry.memo || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ opacity: 0.7 }}>Entry ID</div>
                      <div style={{ fontWeight: 600 }}>{selectedEntry.id}</div>
                    </div>
                  </div>
                  {!isPremium && !isVisibleToUser(selectedEntry) ? (
                    <div
                      data-testid="balance-preview-locked-history-card"
                      style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 16,
                        border: '1px solid rgba(168, 131, 102, 0.35)',
                        background: 'rgba(255,255,255,0.76)',
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600 }}>
                        {BALANCE_PREVIEW_TITLE}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>{BALANCE_PREVIEW_BODY}</div>
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('paywall:open', { detail: { reason: 'Unlock full balance history.' } })
                          )
                        }
                        style={{
                          marginTop: 12,
                          border: '1px solid rgba(95, 74, 62, 0.28)',
                          background: 'linear-gradient(135deg, rgba(182, 121, 103, 0.98), rgba(211, 164, 144, 0.98))',
                          color: '#fffaf6',
                          borderRadius: 999,
                          padding: '10px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {BALANCE_PREVIEW_CTA}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>,
              document.body
            )
          : null}
      </Container>
    </main>
  )
}
