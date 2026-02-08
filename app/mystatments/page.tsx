'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

const STATEMENT_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

type StatementEntry = {
  id: string
  date: string
  description: string
  amount: string
  category: string
}

type StatementSummary = {
  endingBalance: string
  deposits: string
  withdrawals: string
  transfers: string
}

type AccountBalance = {
  id: number
  name: string
  balance: number
}

function formatMonthLabel(date: Date) {
  return `${STATEMENT_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildMonthOptions(count = 12) {
  const now = new Date()
  const options: { label: string; value: string }[] = []
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    options.push({ label: formatMonthLabel(date), value: formatMonthValue(date) })
  }
  return options
}

function buildFallbackSummary(): StatementSummary {
  return {
    endingBalance: '$0.00',
    deposits: '$0.00',
    withdrawals: '$0.00',
    transfers: '$0.00',
  }
}

function buildFallbackEntries(): StatementEntry[] {
  return [
    {
      id: 'placeholder-1',
      date: '—',
      description: 'Statement data will appear here once available.',
      amount: '$0.00',
      category: 'Info',
    },
  ]
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function MyStatementsPage() {
  const [months] = useState(() => buildMonthOptions(12))
  const [selectedMonth, setSelectedMonth] = useState(months[0]?.value ?? '')
  const [summary, setSummary] = useState<StatementSummary>(buildFallbackSummary())
  const [entries, setEntries] = useState<StatementEntry[]>(buildFallbackEntries())
  const [accounts, setAccounts] = useState<AccountBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const printRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    async function loadStatements() {
      if (!selectedMonth) return
      setLoading(true)
      setMsg('')
      try {
        const res = await api.get('/statements', { params: { month: selectedMonth } })
        const data = res.data ?? {}
        const nextSummary = data.summary ?? buildFallbackSummary()
        const nextEntries = Array.isArray(data.entries) && data.entries.length ? data.entries : buildFallbackEntries()
        setSummary(nextSummary)
        setEntries(nextEntries)
      } catch (e: any) {
        setMsg(e?.response?.data?.detail ?? e?.message ?? 'Statements unavailable. Showing sample layout.')
        setSummary(buildFallbackSummary())
        setEntries(buildFallbackEntries())
      } finally {
        setLoading(false)
      }
    }
    loadStatements()
  }, [selectedMonth])

  useEffect(() => {
    async function loadAccounts() {
      try {
        const accountsRes = await api.get('/accounts')
        const rawAccounts = Array.isArray(accountsRes.data) ? accountsRes.data : []
        const balances = await Promise.all(
          rawAccounts.map(async (acct: any) => {
            try {
              const balanceRes = await api.get(`/accounts/${acct.id}/balance`, { params: { currency: 'USD' } })
              return { id: acct.id, name: acct.name ?? 'Account', balance: Number(balanceRes.data?.balance ?? 0) }
            } catch {
              return { id: acct.id, name: acct.name ?? 'Account', balance: NaN }
            }
          })
        )
        setAccounts(balances)
        const totalBalance = balances.reduce((sum, acct) => sum + (Number.isFinite(acct.balance) ? acct.balance : 0), 0)
        setSummary((prev) => ({
          ...prev,
          endingBalance: totalBalance > 0 ? formatMoney(totalBalance) : prev.endingBalance,
        }))
      } catch {
        setAccounts([])
      }
    }
    loadAccounts()
  }, [])

  const totalRowCount = useMemo(() => entries.length, [entries])

  function handlePrint() {
    if (typeof window === 'undefined') return
    window.print()
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <div className="no-print">
        <Navbar showAccountsDropdown />
      </div>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => history.back()}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              background: 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ fontSize: 12, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Statement Month
            </label>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(95, 74, 62, 0.35)',
                background: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
              }}
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(95, 74, 62, 0.35)',
              background: 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Print Statement
          </button>
        </div>

        {msg ? (
          <div className="no-print" style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            {msg}
          </div>
        ) : null}

        <div
          ref={printRef}
          style={{
            marginTop: 24,
            background: '#fff',
            borderRadius: 18,
            border: '1px solid rgba(95, 74, 62, 0.25)',
            padding: '28px 28px 36px',
            boxShadow: '0 18px 42px rgba(28, 18, 12, 0.12)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
                ManifestBank™ Statement
              </div>
              <div style={{ marginTop: 6, opacity: 0.7 }}>Private Vault | {selectedMonth}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.6 }}>
                Account Summary
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ending Balance: {summary.endingBalance}</div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {[
              { label: 'Deposits', value: summary.deposits },
              { label: 'Withdrawals', value: summary.withdrawals },
              { label: 'Transfers', value: summary.transfers },
              { label: 'Ending Balance', value: summary.endingBalance },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(95, 74, 62, 0.18)',
                  background: 'rgba(247, 243, 240, 0.9)',
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, fontWeight: 700 }}>Accounts & Balances</div>
          <div
            style={{
              marginTop: 10,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 140px',
                gap: 10,
                padding: '10px 12px',
                background: 'rgba(95, 74, 62, 0.08)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              <div>Account</div>
              <div>Balance</div>
            </div>
            {accounts.length ? (
              accounts.map((acct) => (
                <button
                  key={acct.id}
                  type="button"
                  onClick={() => (window.location.href = `/mystatments/${acct.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 140px',
                    gap: 10,
                    padding: '10px 12px',
                    borderTop: '1px solid rgba(95, 74, 62, 0.12)',
                    fontSize: 12,
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{acct.name}</div>
                  <div>{Number.isFinite(acct.balance) ? formatMoney(acct.balance) : 'Unavailable'}</div>
                </button>
              ))
            ) : (
              <div style={{ padding: '10px 12px', fontSize: 12, opacity: 0.7 }}>No accounts found.</div>
            )}
          </div>

          <div style={{ marginTop: 22, fontWeight: 700 }}>Activity</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Total entries: {totalRowCount}</div>

          <div
            style={{
              marginTop: 12,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1.6fr 120px 140px',
                gap: 10,
                padding: '10px 12px',
                background: 'rgba(95, 74, 62, 0.08)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              <div>Date</div>
              <div>Description</div>
              <div>Amount</div>
              <div>Category</div>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1.6fr 120px 140px',
                  gap: 10,
                  padding: '10px 12px',
                  borderTop: '1px solid rgba(95, 74, 62, 0.12)',
                  fontSize: 12,
                }}
              >
                <div>{entry.date}</div>
                <div style={{ fontWeight: 600 }}>{entry.description}</div>
                <div>{entry.amount}</div>
                <div>{entry.category}</div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.6,
              textAlign: 'center',
            }}
          >
            ManifestBank is not a financial institution.
          </div>
        </div>
      </div>
    </main>
  )
}
