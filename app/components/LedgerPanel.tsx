'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import { Card, Button } from './ui'
import PremiumPaywall from './PremiumPaywall'
import { useAuth } from '@/app/providers'

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
  meta?: any
  created_at: string
}

type Balance = {
  account_id: number
  currency: string
  balance: string
  as_of: string
}

type ScheduledEntry = {
  id: number
  account_id: number
  created_by_user_id: number
  direction: 'credit' | 'debit'
  amount: string
  currency: string
  entry_type: string
  status: string
  reference?: string | null
  memo?: string | null
  scheduled_for: string
  created_at: string
  posted_at?: string | null
  posted_entry_id?: number | null
}

function getCurrencyFormatter(currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function errMsg(err: any) {
  const detail = err?.response?.data?.detail
  if (Array.isArray(detail)) return JSON.stringify(detail)
  return detail ?? err?.message ?? 'Unknown error'
}

export default function LedgerPanel({
  accountId,
  isVerified = true,
}: {
  accountId: number
  isVerified?: boolean
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [scheduled, setScheduled] = useState<ScheduledEntry[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositMemo, setDepositMemo] = useState('')
  const [depositRef, setDepositRef] = useState('')
  const [showDeposit, setShowDeposit] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null)
  const [checkPreviewUrl, setCheckPreviewUrl] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleAmount, setScheduleAmount] = useState('')
  const [scheduleMemo, setScheduleMemo] = useState('')
  const [scheduleRef, setScheduleRef] = useState('')
  const [scheduleDirection, setScheduleDirection] = useState<'credit' | 'debit'>('credit')
  const [scheduleWhen, setScheduleWhen] = useState('')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallReason, setPaywallReason] = useState('')
  const canPost = isVerified !== false
  const router = useRouter()
  const { me } = useAuth()
  const isPremium = Boolean(me?.is_premium || me?.role === 'admin')

  function openPaywall(reason?: string) {
    setPaywallReason(reason ?? 'Upgrade to unlock unlimited transactions.')
    setPaywallOpen(true)
  }

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const [eRes, bRes] = await Promise.all([
        api.get(`/accounts/${accountId}/ledger?limit=25&offset=0`),
        api.get(`/accounts/${accountId}/balance?currency=USD`),
      ])
      setEntries(eRes.data)
      setBalance(bRes.data)
      const sRes = await api.get(`/accounts/${accountId}/scheduled-entries`)
      setScheduled(sRes.data)
    } catch (e: any) {
      setMsg(`❌ Ledger load failed: ${errMsg(e)}`)
    } finally {
      setLoading(false)
    }
  }

  async function post(direction: 'credit' | 'debit', amount: string) {
    if (!canPost) {
      setMsg('❌ Verify your email to post ledger entries.')
      return
    }
    setPosting(true)
    setMsg('')
    try {
      const entryType = direction === 'credit' ? 'deposit' : 'withdrawal'
      await api.post('/ledger/entries', {
        account_id: accountId,
        direction,
        amount,
        currency: 'USD',
        entry_type: entryType,
        status: 'posted',
        reference: 'dashboard',
        idempotency_key: `${accountId}:${direction}:${amount}:${Date.now()}`,
        memo: `${entryType} via dashboard`,
        meta: { source: 'dashboard', quick_action: true },
      })
      await load()
    } catch (e: any) {
      if (e?.response?.status === 402) {
        openPaywall(e?.response?.data?.detail)
      } else {
        setMsg(`❌ Post failed: ${errMsg(e)}`)
      }
    } finally {
      setPosting(false)
    }
  }

  async function submitDeposit() {
    if (!canPost) {
      setMsg('❌ Verify your email to post deposits.')
      return
    }
    const normalizedAmount = depositAmount.replace(/,/g, '').trim()
    const parsed = Number(normalizedAmount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMsg('❌ Enter a valid deposit amount.')
      return
    }

    setPosting(true)
    setMsg('')
    try {
      await api.post('/ledger/entries', {
        account_id: accountId,
        direction: 'credit',
        amount: parsed.toFixed(2),
        currency: 'USD',
        entry_type: 'deposit',
        status: 'posted',
        reference: depositRef || 'dashboard-deposit',
        idempotency_key: `${accountId}:deposit:${parsed}:${Date.now()}`,
        memo: depositMemo || 'Deposit via dashboard',
        meta: { source: 'dashboard', kind: 'deposit' },
      })
      setDepositAmount('')
      setDepositMemo('')
      setDepositRef('')
      await load()
      setMsg('✅ Deposit posted.')
      setShowDeposit(false)
    } catch (e: any) {
      if (e?.response?.status === 402) {
        openPaywall(e?.response?.data?.detail)
      } else {
        setMsg(`❌ Deposit failed: ${errMsg(e)}`)
      }
    } finally {
      setPosting(false)
    }
  }

  async function submitSchedule() {
    if (!canPost) {
      setMsg('❌ Verify your email to schedule deposits.')
      return
    }
    const normalizedAmount = scheduleAmount.replace(/,/g, '').trim()
    const parsed = Number(normalizedAmount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMsg('❌ Enter a valid scheduled amount.')
      return
    }
    if (!scheduleWhen) {
      setMsg('❌ Choose a date and time.')
      return
    }

    setPosting(true)
    setMsg('')
    try {
      await api.post('/scheduled-entries', {
        account_id: accountId,
        direction: scheduleDirection,
        amount: parsed.toFixed(2),
        currency: 'USD',
        entry_type: 'scheduled',
        reference: scheduleRef || 'scheduled',
        memo: scheduleMemo || 'Scheduled movement',
        scheduled_for: new Date(scheduleWhen).toISOString(),
      })
      setScheduleAmount('')
      setScheduleMemo('')
      setScheduleRef('')
      setScheduleWhen('')
      setShowSchedule(false)
      await load()
      setMsg('✅ Scheduled movement saved.')
    } catch (e: any) {
      if (e?.response?.status === 402) {
        openPaywall(e?.response?.data?.detail)
      } else {
        setMsg(`❌ Schedule failed: ${errMsg(e)}`)
      }
    } finally {
      setPosting(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  useEffect(() => {
    if (!selectedEntry) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [selectedEntry])

  const visibleEntries = entries.filter(
    (entry) => !(entry.entry_type === 'scheduled' && entry.status !== 'posted')
  )
  const previewEntries = visibleEntries.slice(0, 3)
  const hasMoreEntries = visibleEntries.length > previewEntries.length
  const runningBalances = computeRunningBalances(entries, balance?.balance)

  return (
    <>
      <PremiumPaywall open={paywallOpen} onClose={() => setPaywallOpen(false)} reason={paywallReason} />
      <Card title="Account Activity" subtitle="Private account flow">
      {msg ? <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>{msg}</div> : null}

      {!canPost ? (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Verify your email to post deposits, withdrawals, or schedules.
        </div>
      ) : null}
      {!isPremium ? (
        <div
          style={{
            fontSize: 12,
            marginBottom: 8,
            fontWeight: 600,
            color: '#7a4b3e',
            textShadow: '0 0 8px rgba(182, 121, 103, 0.55), 0 0 16px rgba(182, 121, 103, 0.35)',
          }}
        >
          Free tier: 2 deposits + 2 expenses per 7 days.
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Balance:{' '}
          <b>{balance ? formatCurrency(balance.balance, balance.currency) : '—'}</b>
        </div>

        <div style={{ flex: 1 }} />

        <Button variant="solid" onClick={() => post('credit', '100.00')} disabled={posting || !canPost}>
          + Deposit 100
        </Button>
        <Button onClick={() => post('debit', '25.00')} disabled={posting || !canPost}>
          - Withdrawal 25
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowDeposit(true)
          }}
          disabled={posting || !canPost}
        >
          New Deposit
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowSchedule(true)
          }}
          disabled={posting || !canPost}
        >
          Schedule Movement
        </Button>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
        {previewEntries.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.75 }}>No entries yet.</div>
        ) : (
          previewEntries.map((e) => (
            <div
              key={e.id}
              style={{
                padding: 12,
                borderRadius: 16,
                border: '1px solid #2f2f2f',
                background: 'rgba(255,255,255,0.01)',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedEntry(e)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 800 }}>
                  {formatDirectionLabel(e)}{' '}
                  {formatCurrency(e.amount, e.currency)}
                </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>#{e.id}</div>
                </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                {formatEntryType(e.entry_type)} • {formatStatusLabel(e.status)} •{' '}
                {new Date(e.created_at).toLocaleDateString('en-US')}
              </div>

              {e.memo ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{e.memo}</div> : null}
            </div>
          ))
        )}
      </div>

      {hasMoreEntries ? (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(
                  'dashboard:last_view',
                  window.location.pathname + window.location.search
                )
              }
              router.push(`/dashboard/activity/${accountId}`)
            }}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              opacity: 0.75,
            }}
          >
            View all activity →
          </button>
        </div>
      ) : null}

      {showDeposit && typeof document !== 'undefined'
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
              onClick={() => setShowDeposit(false)}
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
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                  New Deposit
                </div>
                <div style={{ opacity: 0.7, marginTop: 4 }}>Record a manifestation deposit for this account.</div>
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount (USD)"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description / memo"
                    value={depositMemo}
                    onChange={(e) => setDepositMemo(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Reference (optional)"
                    value={depositRef}
                    onChange={(e) => setDepositRef(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeposit(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="solid" onClick={submitDeposit} disabled={posting || !canPost}>
                    {posting ? 'Posting…' : 'Deposit Funds'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

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
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              {formatDirectionLabel(selectedEntry)} Details
            </div>
            <div style={{ opacity: 0.7, marginTop: 4 }}>Private ledger confirmation</div>

            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <DetailRow label="Amount" value={formatCurrency(selectedEntry.amount, selectedEntry.currency)} />
              <DetailRow label="Reference" value={selectedEntry.reference || '—'} />
              <DetailRow label="Memo" value={selectedEntry.memo || '—'} />
              <DetailRow label="Date / Time" value={new Date(selectedEntry.created_at).toLocaleDateString('en-US')} />
              <DetailRow label="Status" value={formatStatusLabel(selectedEntry.status)} />
              <DetailRow label="Entry ID" value={`#${selectedEntry.id}`} />
              <DetailRow
                label="Running Balance"
                value={runningBalances[selectedEntry.id] ?? '—'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              {selectedEntry.meta?.check_snapshot ? (
                <Button
                  variant="outline"
                  onClick={() => setCheckPreviewUrl(selectedEntry.meta.check_snapshot)}
                >
                  View Check
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEntry(null)
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
        , document.body)
        : null}

      {checkPreviewUrl && typeof document !== 'undefined'
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
            zIndex: 70,
            padding: 20,
          }}
          onClick={() => setCheckPreviewUrl(null)}
        >
          <div
            style={{
              width: 'min(900px, 100%)',
              borderRadius: 20,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              background: 'rgba(255,255,255,0.96)',
              padding: 16,
              boxShadow: 'var(--shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={checkPreviewUrl}
              alt="Check preview"
              style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button variant="outline" onClick={() => setCheckPreviewUrl(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
        , document.body)
        : null}

      {showSchedule && typeof document !== 'undefined'
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
              onClick={() => setShowSchedule(false)}
            >
              <div
                style={{
                  width: 'min(520px, 100%)',
                  background:
                    'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
                  borderRadius: 20,
                  border: '1px solid rgba(95, 74, 62, 0.2)',
                  padding: 20,
                  boxShadow: 'var(--shadow)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
                  Schedule Movement
                </div>
                <div style={{ opacity: 0.7, marginTop: 4 }}>Queue a future deposit or withdrawal.</div>
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  <select
                    value={scheduleDirection}
                    onChange={(e) => setScheduleDirection(e.target.value as 'credit' | 'debit')}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  >
                    <option value="credit">Deposit</option>
                    <option value="debit">Withdrawal</option>
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount (USD)"
                    value={scheduleAmount}
                    onChange={(e) => setScheduleAmount(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="datetime-local"
                    value={scheduleWhen}
                    onChange={(e) => setScheduleWhen(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description / memo"
                    value={scheduleMemo}
                    onChange={(e) => setScheduleMemo(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Reference (optional)"
                    value={scheduleRef}
                    onChange={(e) => setScheduleRef(e.target.value)}
                    disabled={!canPost}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSchedule(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="solid" onClick={submitSchedule} disabled={posting || !canPost}>
                    {posting ? 'Scheduling…' : 'Schedule'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      </Card>
    </>
  )
}

function formatCurrency(value: string | number, currency: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return String(value)
  return getCurrencyFormatter(currency).format(parsed)
}

function formatDirectionLabel(entry: LedgerEntry) {
  if (entry.direction === 'credit') {
    return 'DEPOSIT'
  }
  return 'WITHDRAWAL'
}

function formatEntryType(entryType: string) {
  if (entryType === 'deposit') return 'CREDIT'
  return entryType.replace(/_/g, ' ').toUpperCase()
}

function formatStatusLabel(status: LedgerEntry['status']) {
  return status.replace(/_/g, ' ').toUpperCase()
}

function computeRunningBalances(entries: LedgerEntry[], currentBalance?: string) {
  const result: Record<number, string> = {}
  const parsedBalance = Number(currentBalance)
  if (!Number.isFinite(parsedBalance)) return result
  let running = parsedBalance
  for (const entry of entries) {
    result[entry.id] = formatCurrency(running, entry.currency)
    const amount = Number(entry.amount)
    if (!Number.isFinite(amount)) continue
    const delta = entry.direction === 'credit' ? amount : -amount
    running = running - delta
  }
  return result
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 600, textAlign: 'right' }}>{value}</div>
    </div>
  )
}
