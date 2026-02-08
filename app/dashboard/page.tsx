'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AccountsPanel from '../components/AccountsPanel'
import Navbar from '../components/Navbar'
import { api } from '../../lib/api'
import { Button, Card, Container, Metric, Pill } from '../components/ui'
import { useAuth } from '../providers'

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function errText(err: any) {
  const status = err?.response?.status
  const data = err?.response?.data
  const detail = data?.detail
  const msg =
    (Array.isArray(detail) ? pretty(detail) : detail) ??
    data?.message ??
    err?.message ??
    'Unknown error'
  return status ? `HTTP ${status}: ${msg}` : msg
}

type PendingCredit = {
  id: number
  account_id: number
  account_name: string
  amount: string
  scheduled_for?: string | null
  memo?: string | null
  direction: 'credit' | 'debit'
}

type Account = {
  id: number
  account_type: string
  name?: string | null
}

type AlertItem = {
  id: string
  title: string
  detail: string
  level: 'low' | 'medium' | 'high'
}

type ActivityItem = {
  id: string
  label: string
  time: string
  meta: string
  accountName: string
  amount: number
  entryType: string
  direction: string
  status: string
  reference: string | null
  memo: string | null
  entryId: string | number | null
  accountId: number
}

type PortfolioSummary = {
  totalAssetsUsd: string
  operatingCashUsd: string
  altsUsd: string
  pendingTransfersUsd: string
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

const baseTargetStorageKey = 'manifestbank_wealth_target_usd'
const targetOwnerStorageKey = 'manifestbank_wealth_target_owner'

function parseMoneyValue(value: string) {
  if (!value || value === '—') return null
  const cleaned = value.replace(/[^\d.-]/g, '')
  if (!cleaned) return null
  const parsed = Number.parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

export default function DashboardPage() {
  const router = useRouter()
  const { logout } = useAuth()
  const [me, setMe] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [log, setLog] = useState<string>('Operations journal ready.')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountBalances, setAccountBalances] = useState<{ id: number; label: string; balance: number }[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    totalAssetsUsd: '—',
    operatingCashUsd: '—',
    altsUsd: '—',
    pendingTransfersUsd: '—',
  })
  const [warmingUp, setWarmingUp] = useState(true)
  const [depositAccountId, setDepositAccountId] = useState<number | ''>('')
  const [depositAmount, setDepositAmount] = useState('')
  const [depositMemo, setDepositMemo] = useState('')
  const [depositRef, setDepositRef] = useState('')
  const [depositTiming, setDepositTiming] = useState<'instant' | 'scheduled'>('instant')
  const [depositWhen, setDepositWhen] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [depositError, setDepositError] = useState('')
  const [expenseAccountId, setExpenseAccountId] = useState<number | ''>('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseMemo, setExpenseMemo] = useState('')
  const [expenseRef, setExpenseRef] = useState('')
  const [expenseTiming, setExpenseTiming] = useState<'instant' | 'scheduled'>('instant')
  const [expenseWhen, setExpenseWhen] = useState('')
  const [expensing, setExpensing] = useState(false)
  const [expenseError, setExpenseError] = useState('')
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([])
  const [pendingDepositsLoading, setPendingDepositsLoading] = useState(false)
  const [pendingCredits, setPendingCredits] = useState<PendingCredit[]>([])
  const [pendingCreditsLoading, setPendingCreditsLoading] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [claimingWelcome, setClaimingWelcome] = useState(false)
  const [welcomeError, setWelcomeError] = useState('')
  const [transferFromId, setTransferFromId] = useState<number | ''>('')
  const [transferToId, setTransferToId] = useState<number | ''>('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferMemo, setTransferMemo] = useState('')
  const [transferRef, setTransferRef] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [wealthTarget, setWealthTarget] = useState<number | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null)
  const [pendingModalOpen, setPendingModalOpen] = useState(false)
  const [pendingDetail, setPendingDetail] = useState<PendingCredit | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [balancesPeekOpen, setBalancesPeekOpen] = useState(false)
  const [verificationMsg, setVerificationMsg] = useState('')
  const [verificationSending, setVerificationSending] = useState(false)
  const dashboardNavRef = useRef<HTMLDivElement | null>(null)
  const enterEtherRef = useRef<HTMLDivElement | null>(null)
  const [etherPortalVisible, setEtherPortalVisible] = useState(false)
  const [etherNoticeCount, setEtherNoticeCount] = useState(0)
  const [etherNoticeLoaded, setEtherNoticeLoaded] = useState(false)
  const [treasureChipOpen, setTreasureChipOpen] = useState(false)
  const treasureChipRef = useRef<HTMLDivElement | null>(null)
  const treasureChipMenuRef = useRef<HTMLDivElement | null>(null)

  function getThreadReadAt(threadId: number) {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(`ether:thread_read:${threadId}`)
  }

  async function countUnreadThreads(profileId: number | null) {
    if (!profileId) return 0
    try {
      const threadsRes = await api.get('/ether/threads')
      const threads = Array.isArray(threadsRes.data) ? threadsRes.data : []
      if (!threads.length) return 0
      const results = await Promise.allSettled(
        threads.map(async (thread: any) => {
          try {
            const messagesRes = await api.get(`/ether/threads/${thread.id}/messages`)
            const list = Array.isArray(messagesRes.data) ? messagesRes.data : []
            const last = list[list.length - 1]
            if (!last) return 0
            const readAt = getThreadReadAt(thread.id)
            const isUnread =
              last.sender_profile_id !== profileId &&
              (!readAt || new Date(last.created_at).getTime() > new Date(readAt).getTime())
            return isUnread ? 1 : 0
          } catch {
            return 0
          }
        })
      )
      return results.reduce((sum, res) => (res.status === 'fulfilled' ? sum + res.value : sum), 0)
    } catch {
      return 0
    }
  }

  async function run(label: string, fn: () => Promise<any>) {
    setLog((prev) => prev + `\n▶ ${label}\n`)
    try {
      const res = await fn()
      setLog((prev) => prev + `✅ ${label} OK\n${pretty(res)}\n\n`)
      return res
    } catch (e: any) {
      setLog((prev) => prev + `❌ ${label} FAIL\n${errText(e)}\n\n`)
      throw e
    }
  }

  async function checkHealth() {
    const res = await run('GET /health', async () => (await api.get('/health')).data)
    setHealth(res)
  }

  async function checkMe() {
    const res = await run('GET /auth/me', async () => (await api.get('/auth/me')).data)
    setMe(res)
    if (res && res.welcome_bonus_claimed === false) {
      setShowWelcome(true)
    }
    if (res?.email_verified) {
      loadProfile().catch(() => {})
      loadEtherNoticeCount().catch(() => {})
    } else {
      setProfile(null)
    }
  }

  async function loadProfile() {
    try {
      const res = await api.get('/ether/me-profile')
      setProfile(res.data)
    } catch {
      setProfile(null)
    }
  }

  async function loadEtherNoticeCount() {
    if (etherNoticeLoaded) return
    try {
      const [notesRes, syncRes] = await Promise.allSettled([
        api.get('/ether/notifications'),
        api.get('/ether/sync/requests'),
      ])
      const list = notesRes.status === 'fulfilled' ? notesRes.value.data : []
      const syncs = syncRes.status === 'fulfilled' ? syncRes.value.data : []
      const unread = Array.isArray(list) ? list.filter((item: any) => !item?.read_at).length : 0
      let profileId = profile?.id ?? null
      if (!profileId) {
        try {
          const profileRes = await api.get('/ether/me-profile')
          profileId = profileRes.data?.id ?? null
        } catch {
          profileId = null
        }
      }
      const myLineUnread = await countUnreadThreads(profileId)
      setEtherNoticeCount(unread + (Array.isArray(syncs) ? syncs.length : 0) + myLineUnread)
    } catch {
      setEtherNoticeCount(0)
    } finally {
      setEtherNoticeLoaded(true)
    }
  }

  async function loadSummary() {
    const res = await run('GET /summary', async () => (await api.get('/summary')).data)
    setSummary(res)
  }

  async function loadPortfolio() {
    try {
      const list = (await api.get('/accounts')).data as Account[]
      setAccounts(list)
      if (!list.length) {
        setPortfolio({
          totalAssetsUsd: '$0.00',
          operatingCashUsd: '$0.00',
          altsUsd: '$0.00',
          pendingTransfersUsd: '$0.00',
        })
        return
      }

      const balanceResults = await Promise.all(
        list.map(async (acct) => {
          const res = await api.get(`/accounts/${acct.id}/balance?currency=USD`)
          const balance = Number(res.data?.balance ?? 0)
          return { acct, balance }
        })
      )

      const pendingResults = await Promise.all(
        list.map(async (acct) => {
          try {
            const res = await api.get(`/accounts/${acct.id}/ledger?limit=200&offset=0`)
            const entries = Array.isArray(res.data) ? res.data : []
            return entries
              .filter((entry) => entry?.status === 'pending')
              .reduce((sum, entry) => sum + Number(entry?.amount ?? 0), 0)
          } catch {
            return 0
          }
        })
      )

      const totalAssets = balanceResults.reduce((sum, item) => sum + item.balance, 0)
      const operatingCash = balanceResults
        .filter((item) =>
          ['personal', 'operating', 'family_office', 'wealth_builder'].includes(item.acct.account_type)
        )
        .reduce((sum, item) => sum + item.balance, 0)
      const alts = balanceResults
        .filter((item) =>
          ['trust', 'entity', 'foundation', 'estate', 'holding', 'investment'].includes(
            item.acct.account_type
          )
        )
        .reduce((sum, item) => sum + item.balance, 0)
      const pendingTransfers = pendingResults.reduce((sum, amount) => sum + amount, 0)

      setPortfolio({
        totalAssetsUsd: moneyFormatter.format(totalAssets),
        operatingCashUsd: moneyFormatter.format(operatingCash),
        altsUsd: moneyFormatter.format(alts),
        pendingTransfersUsd: moneyFormatter.format(pendingTransfers),
      })
      setAccountBalances(
        balanceResults.map((item) => ({
          id: item.acct.id,
          label: item.acct.name ?? item.acct.account_type ?? `Account #${item.acct.id}`,
          balance: item.balance,
        }))
      )
    } catch (e: any) {
      addNote(`Portfolio refresh failed: ${errText(e)}`)
    }
  }

  function normalizeMoneyInput(value: string) {
    return value.replace(/[^\d.,]/g, '').replace(/,/g, '')
  }

  async function submitDeposit() {
    setDepositError('')
    const parsed = Number(normalizeMoneyInput(depositAmount).trim())
    if (!depositAccountId) {
      const msg = 'Choose an account to deposit into.'
      setDepositError(msg)
      setLog((prev) => prev + `\n❌ ${msg}\n`)
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const msg = 'Enter a valid deposit amount.'
      setDepositError(msg)
      setLog((prev) => prev + `\n❌ ${msg}\n`)
      return
    }
    if (depositTiming === 'scheduled' && !depositWhen) {
      const msg = 'Choose a future date/time for the scheduled deposit.'
      setDepositError(msg)
      setLog((prev) => prev + `\n❌ ${msg}\n`)
      return
    }

    setDepositing(true)
    try {
      if (depositTiming === 'scheduled') {
        await api.post('/scheduled-entries', {
          account_id: Number(depositAccountId),
          direction: 'credit',
          amount: parsed.toFixed(2),
          currency: 'USD',
          entry_type: 'scheduled',
          reference: depositRef || 'dashboard-scheduled-deposit',
          memo: depositMemo || 'Scheduled deposit via dashboard',
          scheduled_for: new Date(depositWhen).toISOString(),
        })
        addNote(`Deposit scheduled for ${new Date(depositWhen).toLocaleString()}.`)
        await loadPendingDeposits(Number(depositAccountId))
      } else {
        await api.post('/ledger/entries', {
          account_id: Number(depositAccountId),
          direction: 'credit',
          amount: parsed.toFixed(2),
          currency: 'USD',
          entry_type: 'deposit',
          status: 'posted',
          reference: depositRef || 'dashboard-deposit',
          idempotency_key: `${depositAccountId}:deposit:${parsed}:${Date.now()}`,
          memo: depositMemo || 'Deposit via dashboard',
          meta: { source: 'dashboard', kind: 'deposit' },
        })
      }
      setDepositAmount('')
      setDepositMemo('')
      setDepositRef('')
      setDepositWhen('')
      setDepositTiming('instant')
      setDepositError('')
      if (depositTiming === 'instant') {
        addNote(`Deposit posted to account #${depositAccountId}.`)
      }
      await loadPortfolio()
      await loadSummary()
      await loadRecentActivity(accounts)
    } catch (e: any) {
      const msg = errText(e)
      setDepositError(`Deposit failed: ${msg}`)
      setLog((prev) => prev + `\n❌ Deposit failed: ${msg}\n`)
    } finally {
      setDepositing(false)
    }
  }

  async function submitExpense() {
    setExpenseError('')
    const parsed = Number(normalizeMoneyInput(expenseAmount).trim())
    if (!expenseAccountId) {
      const msg = 'Choose an account to withdraw from.'
      setExpenseError(msg)
      setLog((prev) => prev + `\n❌ ${msg}\n`)
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const msg = 'Enter a valid withdrawal amount.'
      setExpenseError(msg)
      setLog((prev) => prev + `\n❌ ${msg}\n`)
      return
    }
    if (expenseTiming === 'scheduled' && !expenseWhen) {
      const msg = 'Choose a future date/time for the scheduled withdrawal.'
      setExpenseError(msg)
      setLog((prev) => prev + `\n❌ ${msg}\n`)
      return
    }

    setExpensing(true)
    try {
      if (expenseTiming === 'scheduled') {
        await api.post('/scheduled-entries', {
          account_id: Number(expenseAccountId),
          direction: 'debit',
          amount: parsed.toFixed(2),
          currency: 'USD',
          entry_type: 'scheduled',
          reference: expenseRef || 'dashboard-scheduled-withdrawal',
          memo: expenseMemo || 'Scheduled withdrawal via dashboard',
          scheduled_for: new Date(expenseWhen).toISOString(),
        })
        addNote(`Withdrawal scheduled for ${new Date(expenseWhen).toLocaleString()}.`)
      } else {
        await api.post('/ledger/entries', {
          account_id: Number(expenseAccountId),
          direction: 'debit',
          amount: parsed.toFixed(2),
          currency: 'USD',
          entry_type: 'withdrawal',
          status: 'posted',
          reference: expenseRef || 'dashboard-withdrawal',
          idempotency_key: `${expenseAccountId}:withdrawal:${parsed}:${Date.now()}`,
          memo: expenseMemo || 'Withdrawal via dashboard',
          meta: { source: 'dashboard', kind: 'withdrawal' },
        })
      }
      setExpenseAmount('')
      setExpenseMemo('')
      setExpenseRef('')
      setExpenseWhen('')
      setExpenseTiming('instant')
      setExpenseError('')
      if (expenseTiming === 'instant') {
        addNote(`Withdrawal posted to account #${expenseAccountId}.`)
      }
      await loadPortfolio()
      await loadSummary()
      await loadRecentActivity(accounts)
    } catch (e: any) {
      const msg = errText(e)
      setExpenseError(`Withdrawal failed: ${msg}`)
      setLog((prev) => prev + `\n❌ Withdrawal failed: ${msg}\n`)
    } finally {
      setExpensing(false)
    }
  }

  async function loadPendingDeposits(accountId: number) {
    setPendingDepositsLoading(true)
    try {
      const res = await api.get(`/accounts/${accountId}/scheduled-entries`)
      const entries = Array.isArray(res.data) ? res.data : []
      const deposits = entries.filter((entry) => entry?.direction === 'credit')
      setPendingDeposits(deposits)
    } catch {
      setPendingDeposits([])
    } finally {
      setPendingDepositsLoading(false)
    }
  }

  async function loadPendingCreditsAll(list: Account[]) {
    if (!list.length) {
      setPendingCredits([])
      return
    }
    setPendingCreditsLoading(true)
    try {
      const results = await Promise.all(
        list.map(async (acct) => {
          try {
            const res = await api.get(`/accounts/${acct.id}/scheduled-entries`)
            const entries = Array.isArray(res.data) ? res.data : []
            return entries
              .filter((entry) => entry?.direction)
              .map((entry) => {
                const rawDirection = String(entry.direction ?? 'credit').toLowerCase()
                const normalized: 'credit' | 'debit' =
                  rawDirection === 'debit' || rawDirection === 'withdrawal' || rawDirection === 'expense'
                    ? 'debit'
                    : 'credit'
                return {
                  id: entry.id,
                  account_id: acct.id,
                  account_name: acct.name ?? `Account #${acct.id}`,
                  amount: entry.amount ?? '0',
                  scheduled_for: entry.scheduled_for,
                  memo: entry.memo ?? null,
                  direction: normalized,
                }
              })
          } catch {
            return []
          }
        })
      )
      setPendingCredits(results.flat())
    } finally {
      setPendingCreditsLoading(false)
    }
  }

  async function loadRecentActivity(list: Account[]) {
    if (!list.length) {
      setActivity([])
      return
    }
    setActivityLoading(true)
    try {
      const results = await Promise.all(
        list.map(async (acct) => {
          try {
            const res = await api.get(`/accounts/${acct.id}/ledger?limit=20&offset=0`)
            const entries = Array.isArray(res.data) ? res.data : []
            return entries.map((entry: any) => ({
              id: `acct-${acct.id}-${entry.id ?? entry.created_at ?? Math.random()}`,
              label: entry.entry_type ?? entry.direction ?? 'Ledger entry',
              time: entry.created_at ?? entry.posted_at ?? entry.scheduled_for ?? '',
              meta: `${acct.name ?? `Account #${acct.id}`} • ${moneyFormatter.format(Number(entry.amount ?? 0))}`,
              accountName: acct.name ?? `Account #${acct.id}`,
              amount: Number(entry.amount ?? 0),
              entryType: entry.entry_type ?? '',
              direction: entry.direction ?? '',
              status: entry.status ?? '',
              reference: entry.reference ?? entry.ref ?? null,
              memo: entry.memo ?? null,
              entryId: entry.id ?? null,
              accountId: acct.id,
            }))
          } catch {
            return []
          }
        })
      )
      const merged = results.flat()
      merged.sort((a, b) => {
        const aTime = a.time ? new Date(a.time).getTime() : 0
        const bTime = b.time ? new Date(b.time).getTime() : 0
        return bTime - aTime
      })
      setActivity(merged.slice(0, 2))
    } finally {
      setActivityLoading(false)
    }
  }

  async function submitTransfer() {
    const parsed = Number(transferAmount.replace(/,/g, '').trim())
    if (!transferFromId || !transferToId || transferFromId === transferToId) {
      setLog((prev) => prev + '\n❌ Choose two different accounts.\n')
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setLog((prev) => prev + '\n❌ Enter a valid transfer amount.\n')
      return
    }

    setTransferring(true)
    try {
      await api.post('/transfers', {
        from_account_id: Number(transferFromId),
        to_account_id: Number(transferToId),
        amount: parsed.toFixed(2),
        currency: 'USD',
        memo: transferMemo || 'Account transfer',
        reference: transferRef || 'transfer',
      })
      setTransferAmount('')
      setTransferMemo('')
      setTransferRef('')
      setTransferFromId('')
      setTransferToId('')
      addNote('Transfer executed.')
      await loadPortfolio()
      await loadSummary()
      await loadRecentActivity(accounts)
    } catch (e: any) {
      setLog((prev) => prev + `\n❌ Transfer failed: ${errText(e)}\n`)
    } finally {
      setTransferring(false)
    }
  }

  async function claimWelcome() {
    setClaimingWelcome(true)
    setWelcomeError('')
    try {
      await api.post('/auth/claim-welcome')
      await checkMe()
      await loadPortfolio()
      await loadSummary()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('accounts:refresh'))
      }
      setShowWelcome(false)
    } catch (e: any) {
      const msg = errText(e)
      setWelcomeError(msg)
      setLog((prev) => prev + `\n❌ Welcome bonus failed: ${msg}\n`)
    } finally {
      setClaimingWelcome(false)
    }
  }

  async function listAccounts() {
    return await run('GET /accounts', async () => (await api.get('/accounts')).data)
  }

  async function quickCreateAccount() {
    return await run('POST /accounts', async () => {
      const payload = { name: 'Primary Account', account_type: 'personal', is_active: true }
      return (await api.post('/accounts', payload)).data
    })
  }

  async function resendVerification() {
    setVerificationSending(true)
    setVerificationMsg('')
    try {
      const res = await api.post('/auth/verify-email/resend')
      if (res.data?.status === 'sent') {
        setVerificationMsg('✅ Verification email sent.')
      } else if (res.data?.status === 'already_verified') {
        setVerificationMsg('✅ Email already verified.')
      } else {
        setVerificationMsg('✅ Verification email sent.')
      }
    } catch (e: any) {
      setVerificationMsg(`❌ ${errText(e)}`)
    } finally {
      setVerificationSending(false)
    }
  }

  function addNote(note: string) {
    setLog((prev) => prev + `\n• ${note}`)
  }

  const targetStorageKey = useMemo(() => {
    if (me?.id) return `${baseTargetStorageKey}:${me.id}`
    if (me?.email) return `${baseTargetStorageKey}:${me.email.toLowerCase()}`
    return baseTargetStorageKey
  }, [me?.id, me?.email])

  function migrateWealthTarget() {
    if (typeof window === 'undefined') return
    const current = window.localStorage.getItem(targetStorageKey)
    if (current) return
    const legacy = window.localStorage.getItem(baseTargetStorageKey)
    if (!legacy) return
    const owner = window.localStorage.getItem(targetOwnerStorageKey)
    const email = me?.email?.toLowerCase()
    if (!owner || (email && owner === email)) {
      window.localStorage.setItem(targetStorageKey, legacy)
    }
  }

  useEffect(() => {
    checkHealth()
    checkMe().catch(() => {})
    const warmTimer = window.setTimeout(() => {
      setWarmingUp(true)
      Promise.all([loadSummary(), loadPortfolio()])
        .catch(() => {})
        .finally(() => setWarmingUp(false))
    }, 600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => window.clearTimeout(warmTimer)
  }, [])

  function syncWealthTarget() {
    const saved = window.localStorage.getItem(targetStorageKey)
    if (saved) {
      const parsed = Number.parseFloat(saved)
      if (!Number.isFinite(parsed)) return
      setWealthTarget(parsed)
      return
    }
    const serverTarget = me?.wealth_target_usd
    if (typeof serverTarget === 'number' && Number.isFinite(serverTarget)) {
      window.localStorage.setItem(targetStorageKey, String(serverTarget))
      setWealthTarget(serverTarget)
      return
    }
    setWealthTarget(null)
  }

  useEffect(() => {
    if (!me?.email) return
    migrateWealthTarget()
    window.localStorage.setItem(targetOwnerStorageKey, me.email.toLowerCase())
    syncWealthTarget()
    function handleStorage(event: StorageEvent) {
      if (event.key !== targetStorageKey) return
      syncWealthTarget()
    }
    function handleCustom(event: Event) {
      const detail = (event as CustomEvent<{ value?: number | null }>).detail
      if (typeof detail?.value === 'number') {
        setWealthTarget(detail.value)
        return
      }
      if (detail?.value === null) {
        setWealthTarget(null)
        return
      }
      syncWealthTarget()
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('wealthTargetChanged', handleCustom)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('wealthTargetChanged', handleCustom)
    }
  }, [me?.email, me?.wealth_target_usd, targetStorageKey])

  useEffect(() => {
    if (!depositAccountId) {
      setPendingDeposits([])
      return
    }
    loadPendingDeposits(Number(depositAccountId)).catch(() => {})
  }, [depositAccountId])

  useEffect(() => {
    loadPendingCreditsAll(accounts).catch(() => {})
    loadRecentActivity(accounts).catch(() => {})
  }, [accounts])

  useEffect(() => {
    if (!selectedActivity && !pendingModalOpen && !pendingDetail && !avatarPreviewUrl) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [selectedActivity, pendingModalOpen, pendingDetail, avatarPreviewUrl])

  useEffect(() => {
    const target = dashboardNavRef.current
    if (!target) return
    const updateVisibility = () => {
      if (!dashboardNavRef.current) return
      const rect = dashboardNavRef.current.getBoundingClientRect()
      setEtherPortalVisible(rect.bottom <= 0)
    }
    updateVisibility()
    if (typeof IntersectionObserver === 'undefined') {
      window.addEventListener('scroll', updateVisibility)
      window.addEventListener('resize', updateVisibility)
      return () => {
        window.removeEventListener('scroll', updateVisibility)
        window.removeEventListener('resize', updateVisibility)
      }
    }
    const observer = new IntersectionObserver(() => updateVisibility(), { threshold: 0 })
    observer.observe(target)
    window.addEventListener('scroll', updateVisibility)
    window.addEventListener('resize', updateVisibility)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', updateVisibility)
      window.removeEventListener('resize', updateVisibility)
    }
  }, [])

  useEffect(() => {
    if (!treasureChipOpen) return
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      if (
        treasureChipRef.current &&
        !treasureChipRef.current.contains(target) &&
        (!treasureChipMenuRef.current || !treasureChipMenuRef.current.contains(target))
      ) {
        setTreasureChipOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setTreasureChipOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [treasureChipOpen])

  const accountsCount = summary?.accounts_count ?? '—'
  const ledgerCount = summary?.ledger_entries_count ?? '—'
  const identity = me?.email ?? 'Not signed in'
  const role = me?.role ?? 'guest'
  const uptime = health?.status ?? '—'

  const alerts: AlertItem[] = useMemo(
    () => [
      { id: 'ALT-1', title: 'KYC refresh due', detail: 'Two accounts require documentation updates', level: 'medium' },
      { id: 'ALT-2', title: 'Liquidity buffer', detail: 'Operating cash dipped below 30-day target', level: 'high' },
      { id: 'ALT-3', title: 'FX exposure', detail: 'EUR holdings exceeded policy band', level: 'low' },
    ],
    []
  )

  const totalAssetsValue = useMemo(() => parseMoneyValue(portfolio.totalAssetsUsd), [portfolio.totalAssetsUsd])
  const wealthBuilderLabel = useMemo(() => {
    const name = accounts.find((acct) => acct.account_type === 'wealth_builder')?.name
    return `${(name ?? 'Wealth Builder').toUpperCase()} PROGRESS`
  }, [accounts])
  const wealthProgress = useMemo(() => {
    if (wealthTarget === null || totalAssetsValue === null) return null
    if (wealthTarget <= 0) return null
    return (totalAssetsValue / wealthTarget) * 100
  }, [totalAssetsValue, wealthTarget])

  const isVerified = Boolean(me?.email_verified)
  const transactionsLocked = !isVerified
  const isAdmin = me?.role === 'admin'

  return (
    <main>
      <div ref={dashboardNavRef}>
        <Navbar sticky={false} />
      </div>
      {isVerified && etherPortalVisible ? (
        <div
          className="ether-portal-chip"
          style={{
            zIndex: 1400,
            display: 'grid',
            gap: 8,
          }}
        >
          <Link href="/ether" style={{ textDecoration: 'none' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
                color: '#4a2f26',
                fontWeight: 700,
                letterSpacing: 0.2,
                maxWidth: 'calc(100vw - 24px)',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255,255,255,0.95)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 12 }}>
                    {profile?.display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}
                  </span>
                )}
              </span>
              Enter The Ether™
              {etherNoticeCount > 0 ? (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: '#b67967',
                    color: '#fff',
                    fontSize: 11,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px',
                    boxShadow: '0 0 10px rgba(182, 121, 103, 0.65)',
                    marginLeft: 2,
                  }}
                >
                  {etherNoticeCount}
                </span>
              ) : null}
            </span>
          </Link>
          <div ref={treasureChipRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setTreasureChipOpen((open) => !open)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.7)',
                background: 'linear-gradient(135deg, rgba(140, 92, 78, 0.35), rgba(245, 234, 226, 0.95))',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#4a2f26',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 16px rgba(140, 92, 78, 0.45)',
                maxWidth: 'calc(100vw - 24px)',
              }}
              aria-haspopup="menu"
              aria-expanded={treasureChipOpen}
            >
              My Treasure Chest
              <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
            </button>
            {treasureChipOpen ? (
              <div
                ref={treasureChipMenuRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 10,
                  minWidth: 200,
                  maxWidth: 'calc(100vw - 24px)',
                  borderRadius: 12,
                  border: '1px solid rgba(140, 92, 78, 0.45)',
                  background: 'rgba(252, 245, 240, 0.98)',
                  boxShadow: '0 20px 44px rgba(12, 10, 12, 0.32)',
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                  zIndex: 99999,
                }}
                role="menu"
              >
                <Link
                  href="/myjournal"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  My Journal
                </Link>
                <Link
                  href="/myaffirmations"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  My Affirmations
                </Link>
                <Link
                  href="/mystatments"
                  style={{ textDecoration: 'none', fontWeight: 600, color: '#4a2f26' }}
                  role="menuitem"
                  onClick={() => setTreasureChipOpen(false)}
                >
                  My Statements
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {me ? (
        <div
          style={{
            padding: '10px 24px 0',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
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
              background: 'rgba(248, 242, 235, 0.96)',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#3b2b24',
            }}
          >
            Logout
          </button>
        </div>
      ) : null}
      <Container>
        {!isVerified ? (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              borderRadius: 16,
              border: '1px solid rgba(182, 121, 103, 0.45)',
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 14px 24px rgba(140, 96, 72, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 13 }}>
              Verify your email to unlock deposits, transfers, and The Ether™.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="outline" onClick={resendVerification} disabled={verificationSending}>
                {verificationSending ? 'Sending…' : 'Resend verification email'}
              </Button>
              {verificationMsg ? <span style={{ fontSize: 12, opacity: 0.7 }}>{verificationMsg}</span> : null}
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }} className="fade-up">
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 600 }}>
              Private Vault Dashboard
            </div>
            <div style={{ opacity: 0.7, marginTop: 6 }}>
              Private banking overview and risk posture.
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <Pill>Identity: {identity}</Pill>
              <Pill>Role: {role}</Pill>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {isVerified ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} ref={enterEtherRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!profile?.avatar_url) return
                    setAvatarPreviewUrl(profile.avatar_url)
                  }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    border: '1px solid rgba(95, 74, 62, 0.35)',
                    background: 'rgba(255,255,255,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    fontWeight: 700,
                    cursor: profile?.avatar_url ? 'pointer' : 'default',
                    padding: 0,
                    boxShadow: '0 0 18px rgba(182, 121, 103, 0.45)',
                  }}
                  aria-label="View profile photo"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{profile?.display_name?.slice(0, 1)?.toUpperCase() ?? '◎'}</span>
                  )}
                </button>
                <Link
                  href="/ether"
                  style={{
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: '1px solid rgba(182, 121, 103, 0.55)',
                      background: 'linear-gradient(135deg, rgba(182,121,103,0.25), rgba(255,255,255,0.75))',
                      boxShadow: '0 0 16px rgba(182, 121, 103, 0.55)',
                      color: '#5d3d32',
                      fontWeight: 700,
                      letterSpacing: 0.2,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    Enter The Ether™
                    {etherNoticeCount > 0 ? (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          borderRadius: 999,
                          background: '#b67967',
                          color: '#fff',
                          fontSize: 11,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 6px',
                          boxShadow: '0 0 10px rgba(182, 121, 103, 0.65)',
                          marginLeft: 2,
                        }}
                      >
                        {etherNoticeCount}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => window.location.assign('/verify-email')}
                style={{
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  borderRadius: 999,
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Verify email to unlock The Ether™
              </button>
            )}
          </div>
        </div>
        {warmingUp ? (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 14,
              border: '1px solid rgba(182, 121, 103, 0.35)',
              background: 'rgba(255, 255, 255, 0.92)',
              boxShadow: '0 10px 22px rgba(140, 96, 72, 0.18)',
              fontSize: 12,
              color: '#6f4a3a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'rgba(182, 121, 103, 0.7)',
                boxShadow: '0 0 12px rgba(182, 121, 103, 0.6)',
                display: 'inline-block',
              }}
            />
            Warming up your vault…
          </div>
        ) : null}

        <section
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'var(--kpi-columns, repeat(3, minmax(0, 1fr)))',
            gridTemplateAreas: 'var(--kpi-areas, "welcome balances wealth")',
            gap: 16,
          }}
          className="fade-up fade-delay-1 kpi-grid"
        >
          <div
            style={{
              gridArea: 'welcome',
              border: '1px solid rgba(95, 74, 62, 0.25)',
              borderRadius: 20,
              padding: 16,
              background: 'var(--paper-strong)',
              boxShadow: 'var(--shadow-soft)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: 108,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Welcome
            </div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font-serif)', lineHeight: 1.2 }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>Good to See You,</div>
              <div style={{ fontSize: 22, fontWeight: 600, wordBreak: 'break-word' }}>
                {me?.username ?? me?.email?.split('@')[0] ?? 'Member'}
              </div>
            </div>
          </div>
          <div
            style={{
              gridArea: 'balances',
              border: '1px solid rgba(95, 74, 62, 0.25)',
              borderRadius: 20,
              padding: 16,
              background: 'var(--paper-strong)',
              boxShadow: 'var(--shadow-soft)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Balances at a Glance
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 600,
                    marginTop: 6,
                    fontFamily: 'var(--font-serif)',
                    textShadow: '0 0 18px rgba(140, 82, 64, 0.75), 0 0 34px rgba(140, 82, 64, 0.45)',
                  }}
                >
                  {portfolio.totalAssetsUsd}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBalancesPeekOpen((open) => !open)}
                style={{
                  alignSelf: 'flex-start',
                  border: '1px solid rgba(95, 74, 62, 0.35)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {balancesPeekOpen ? 'Hide' : 'Peek'}
              </button>
            </div>
            {balancesPeekOpen ? (
              <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                {accountBalances.length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No balances yet.</div>
                ) : (
                  accountBalances.map((item) => (
                    <div
                      key={item.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                    >
                      <span style={{ fontSize: 12 }}>{item.label}</span>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>{moneyFormatter.format(item.balance)}</span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div
            style={{
              gridArea: 'wealth',
              border: '1px solid rgba(95, 74, 62, 0.25)',
              borderRadius: 20,
              padding: 16,
              background: 'var(--paper-strong)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {wealthBuilderLabel}
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, marginTop: 6, fontFamily: 'var(--font-serif)' }}>
              {wealthProgress === null ? '—' : `${percentFormatter.format(wealthProgress)}%`}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              {wealthTarget ? `Target ${moneyFormatter.format(wealthTarget)}` : 'No target set'}
            </div>
          </div>
        </section>

        <section id="accounts" style={{ marginTop: 24, scrollMarginTop: 120 }} className="fade-up fade-delay-2">
          <AccountsPanel
            isVerified={isVerified}
            wealthTargetStorageKey={targetStorageKey}
            wealthTargetOwnerEmail={me?.email ?? null}
          />
        </section>

        <section
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 16,
          }}
          className="fade-up fade-delay-2"
        >
          <Card title="Portfolio Balances" tone="soft">
            <div style={{ display: 'grid', gap: 12 }}>
              <BalanceRow label="Total Assets (USD)" value={portfolio.totalAssetsUsd} />
              <BalanceRow label="Operating Cash" value={portfolio.operatingCashUsd} />
              <BalanceRow label="Alternative Holdings" value={portfolio.altsUsd} />
              <BalanceRow label="Pending Transfers" value={portfolio.pendingTransfersUsd} />
            </div>
            <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12 }}>
              Balances update after ledger close. Adjust targets in Treasury settings.
            </div>
          </Card>

        </section>

        <section
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'var(--dashboard-dual-columns)',
            gap: 16,
          }}
          className="fade-up fade-delay-2 dashboard-dual-grid"
        >
          <Card
            title="Deposit Funds"
            tone="soft"
            right={<Pill>{depositTiming === 'instant' ? 'Instant credit' : 'Scheduled'}</Pill>}
          >
            {transactionsLocked ? (
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                Verify your email to enable deposits and scheduled credits.
              </div>
            ) : null}
            {accounts.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                No accounts yet. Create one first, then return to deposit funds.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(Number(e.target.value))}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                >
                  <option value="">Select account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      #{acct.id} • {acct.account_type}
                    </option>
                  ))}
                </select>
                <select
                  value={depositTiming}
                  onChange={(e) => setDepositTiming(e.target.value as 'instant' | 'scheduled')}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                >
                  <option value="instant">Deposit now (instant)</option>
                  <option value="scheduled">Schedule for later</option>
                </select>
                {depositTiming === 'scheduled' ? (
                  <input
                    type="datetime-local"
                    value={depositWhen}
                    onChange={(e) => setDepositWhen(e.target.value)}
                    disabled={transactionsLocked}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                ) : null}
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.6,
                      fontSize: 13,
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount (USD)"
                    value={depositAmount}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^\d.,]/g, '')
                      setDepositAmount(next)
                    }}
                    disabled={transactionsLocked}
                    style={{
                      padding: '10px 12px 10px 28px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description / memo"
                  value={depositMemo}
                  onChange={(e) => setDepositMemo(e.target.value)}
                  disabled={transactionsLocked}
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
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                />
                {depositError ? (
                  <div style={{ fontSize: 12, color: '#7a2e2e', marginTop: 8 }}>{depositError}</div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="solid" onClick={submitDeposit} disabled={depositing || transactionsLocked}>
                    {depositing ? 'Posting…' : 'Deposit Funds'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Expense"
            tone="soft"
            right={<Pill>{expenseTiming === 'instant' ? 'Instant debit' : 'Scheduled'}</Pill>}
          >
            {transactionsLocked ? (
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                Verify your email to enable withdrawals and scheduled debits.
              </div>
            ) : null}
            {accounts.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                No accounts yet. Create one first, then return to expense funds.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <select
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(Number(e.target.value))}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                >
                  <option value="">Select account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      #{acct.id} • {acct.account_type}
                    </option>
                  ))}
                </select>
                <select
                  value={expenseTiming}
                  onChange={(e) => setExpenseTiming(e.target.value as 'instant' | 'scheduled')}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                >
                  <option value="instant">Withdraw now (instant)</option>
                  <option value="scheduled">Schedule for later</option>
                </select>
                {expenseTiming === 'scheduled' ? (
                  <input
                    type="datetime-local"
                    value={expenseWhen}
                    onChange={(e) => setExpenseWhen(e.target.value)}
                    disabled={transactionsLocked}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                ) : null}
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.6,
                      fontSize: 13,
                    }}
                  >
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount (USD)"
                    value={expenseAmount}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^\d.,]/g, '')
                      setExpenseAmount(next)
                    }}
                    disabled={transactionsLocked}
                    style={{
                      padding: '10px 12px 10px 28px',
                      borderRadius: 12,
                      border: '1px solid rgba(95, 74, 62, 0.3)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      fontSize: 13,
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description / memo"
                  value={expenseMemo}
                  onChange={(e) => setExpenseMemo(e.target.value)}
                  disabled={transactionsLocked}
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
                  value={expenseRef}
                  onChange={(e) => setExpenseRef(e.target.value)}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                />
                {expenseError ? (
                  <div style={{ fontSize: 12, color: '#7a2e2e', marginTop: 8 }}>{expenseError}</div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="solid" onClick={submitExpense} disabled={expensing || transactionsLocked}>
                    {expensing ? 'Posting…' : 'Withdraw Funds'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </section>

        <section
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'var(--dashboard-dual-columns)',
            gap: 16,
          }}
          className="fade-up fade-delay-3 dashboard-dual-grid"
        >
          <Card title="Transfer Funds" tone="soft" right={<Pill>Between accounts</Pill>}>
            {transactionsLocked ? (
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                Verify your email to enable transfers.
              </div>
            ) : null}
            {accounts.length < 2 ? (
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Add at least two accounts to transfer funds.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                <select
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(Number(e.target.value))}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                >
                  <option value="">From account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      #{acct.id} • {acct.account_type}
                    </option>
                  ))}
                </select>
                <select
                  value={transferToId}
                  onChange={(e) => setTransferToId(Number(e.target.value))}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                >
                  <option value="">To account</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      #{acct.id} • {acct.account_type}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount (USD)"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  disabled={transactionsLocked}
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
                  value={transferMemo}
                  onChange={(e) => setTransferMemo(e.target.value)}
                  disabled={transactionsLocked}
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
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  disabled={transactionsLocked}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.3)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 13,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="solid" onClick={submitTransfer} disabled={transferring || transactionsLocked}>
                    {transferring ? 'Transferring…' : 'Transfer Funds'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div
            onClick={() => setPendingModalOpen(true)}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setPendingModalOpen(true)
              }
            }}
          >
            <Card
              title="Pending Deposits & Expenses"
              tone="soft"
              right={<Pill>{pendingCredits.length} scheduled</Pill>}
            >
            {pendingCreditsLoading ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>Loading pending activity…</div>
            ) : pendingCredits.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No pending deposits or expenses on file.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {pendingCredits.slice(0, 2).map((entry) => (
                  <div
                    key={entry.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      setPendingModalOpen(false)
                      setPendingDetail(entry)
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: '1px solid rgba(95, 74, 62, 0.2)',
                      background: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {entry.memo || (entry.direction === 'debit' ? 'Scheduled withdrawal' : 'Scheduled deposit')}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{entry.account_name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>
                          {entry.direction === 'debit' ? '-' : '+'}
                          {moneyFormatter.format(Number(entry.amount ?? 0))}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {entry.scheduled_for ? new Date(entry.scheduled_for).toLocaleString() : 'Scheduled'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <a
                href="#accounts"
                onClick={(event) => event.stopPropagation()}
                style={{ textDecoration: 'none', fontSize: 12, opacity: 0.75 }}
              >
                View all pending →
              </a>
            </div>
            </Card>
          </div>
        </section>

        <section
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 16,
          }}
          className="fade-up fade-delay-3"
        >
          <Card title="Recent Activity" tone="soft">
            {activityLoading ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>Loading recent activity…</div>
            ) : activity.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>No recent activity yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {activity.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedActivity(item)}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      border: '1px solid rgba(95, 74, 62, 0.18)',
                      background: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      {item.time ? new Date(item.time).toLocaleString() : '—'} • {item.meta}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <a href="#accounts" style={{ textDecoration: 'none', fontSize: 12, opacity: 0.75 }}>
                View all activity →
              </a>
            </div>
          </Card>
        </section>

        {isAdmin ? (
          <section style={{ marginTop: 24 }}>
            <Card title="Operations Desk" tone="deep" right={<Pill>Live API</Pill>}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button variant="outline" onClick={checkHealth}>
                  Test /health
                </Button>
                <Button variant="outline" onClick={checkMe}>
                  Test /auth/me
                </Button>
                <Button variant="outline" onClick={listAccounts}>
                  Test GET /accounts
                </Button>
                <Button variant="outline" onClick={quickCreateAccount}>
                  Test POST /accounts
                </Button>
                <Button variant="outline" onClick={loadSummary}>
                  Test /summary
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLog('Operations journal cleared.')
                  }}
                >
                  Clear Journal
                </Button>
              </div>

              <pre
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.2)',
                  maxHeight: 280,
                  overflow: 'auto',
                  background: 'rgba(0,0,0,0.25)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {log}
              </pre>
            </Card>
          </section>
        ) : null}

      </Container>

      {selectedActivity ? (
        <div
          onClick={() => setSelectedActivity(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              maxHeight: 'min(85vh, 720px)',
              overflow: 'auto',
              borderRadius: 20,
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: 'var(--shadow)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 18, fontFamily: 'var(--font-serif)' }}>Transaction Details</div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: 0.7,
                }}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600 }}>{selectedActivity.label}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {selectedActivity.time ? new Date(selectedActivity.time).toLocaleString() : '—'}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <BalanceRow label="Account" value={selectedActivity.accountName} />
                <BalanceRow label="Amount" value={moneyFormatter.format(selectedActivity.amount)} />
                <BalanceRow
                  label="Type"
                  value={selectedActivity.entryType || selectedActivity.direction || '—'}
                />
                <BalanceRow label="Status" value={selectedActivity.status || 'posted'} />
                <BalanceRow label="Reference" value={selectedActivity.reference || '—'} />
                <BalanceRow label="Memo" value={selectedActivity.memo || '—'} />
                <BalanceRow
                  label="Entry ID"
                  value={selectedActivity.entryId ? String(selectedActivity.entryId) : '—'}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingModalOpen ? (
        <div
          onClick={() => setPendingModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(560px, 100%)',
              maxHeight: 'min(85vh, 720px)',
              overflow: 'auto',
              borderRadius: 20,
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: 'var(--shadow)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 18, fontFamily: 'var(--font-serif)' }}>
                Pending Deposits & Expenses
              </div>
              <button
                type="button"
                onClick={() => setPendingModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: 0.7,
                }}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              {pendingCreditsLoading ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>Loading pending activity…</div>
              ) : pendingCredits.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>No pending deposits or expenses on file.</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {pendingCredits.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setPendingModalOpen(false)
                        setPendingDetail(entry)
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        border: '1px solid rgba(95, 74, 62, 0.2)',
                        background: 'rgba(255, 255, 255, 0.78)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {entry.memo || (entry.direction === 'debit' ? 'Scheduled expense' : 'Scheduled deposit')}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{entry.account_name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600 }}>
                            {entry.direction === 'debit' ? '-' : '+'}
                            {moneyFormatter.format(Number(entry.amount ?? 0))}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            {entry.scheduled_for ? new Date(entry.scheduled_for).toLocaleString() : 'Scheduled'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pendingDetail ? (
        <div
          onClick={() => setPendingDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              maxHeight: 'min(85vh, 720px)',
              overflow: 'auto',
              borderRadius: 20,
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: 'var(--shadow)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 18, fontFamily: 'var(--font-serif)' }}>
                Pending Movement
              </div>
              <button
                type="button"
                onClick={() => setPendingDetail(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: 0.7,
                }}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600 }}>
                {pendingDetail.memo ||
                  (pendingDetail.direction === 'debit' ? 'Scheduled expense' : 'Scheduled deposit')}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {pendingDetail.scheduled_for
                  ? new Date(pendingDetail.scheduled_for).toLocaleString()
                  : 'Scheduled'}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <BalanceRow label="Account" value={pendingDetail.account_name} />
                <BalanceRow
                  label="Amount"
                  value={`${pendingDetail.direction === 'debit' ? '-' : '+'}${moneyFormatter.format(
                    Number(pendingDetail.amount ?? 0)
                  )}`}
                />
                <BalanceRow label="Type" value={pendingDetail.direction === 'debit' ? 'Expense' : 'Deposit'} />
                <BalanceRow label="Status" value="scheduled" />
                <BalanceRow label="Entry ID" value={String(pendingDetail.id)} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {avatarPreviewUrl ? (
        <div
          onClick={() => setAvatarPreviewUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 70,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(360px, 100%)',
              borderRadius: 24,
              background: 'rgba(255, 255, 255, 0.96)',
              border: '1px solid rgba(95, 74, 62, 0.2)',
              boxShadow: 'var(--shadow)',
              padding: 16,
            }}
          >
            <img
              src={avatarPreviewUrl}
              alt="Profile"
              style={{ width: '100%', height: 'auto', borderRadius: 18, display: 'block' }}
            />
          </div>
        </div>
      ) : null}

      {showWelcome ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(21, 16, 12, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: 20,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(560px, 100%)',
              background:
                'linear-gradient(135deg, rgba(199, 140, 122, 0.96), rgba(220, 193, 179, 0.98)), radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.7), transparent 52%), radial-gradient(circle at 78% 10%, rgba(255, 255, 255, 0.45), transparent 58%), linear-gradient(25deg, rgba(80, 58, 48, 0.35) 0%, rgba(255, 255, 255, 0.12) 22%, rgba(80, 58, 48, 0.32) 40%, rgba(255, 255, 255, 0.1) 58%, rgba(80, 58, 48, 0.28) 100%), linear-gradient(115deg, rgba(90, 66, 54, 0.32) 0%, rgba(255, 255, 255, 0.1) 20%, rgba(90, 66, 54, 0.3) 42%, rgba(255, 255, 255, 0.1) 60%, rgba(90, 66, 54, 0.26) 100%), linear-gradient(160deg, rgba(66, 47, 38, 0.28) 0%, rgba(255, 255, 255, 0.08) 25%, rgba(66, 47, 38, 0.26) 48%, rgba(255, 255, 255, 0.08) 70%, rgba(66, 47, 38, 0.22) 100%)',
              borderRadius: 24,
              border: '1px solid rgba(95, 74, 62, 0.2)',
              padding: 28,
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
            }}
          >
            <Confetti />
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600 }}>
              $999 Welcome Deposit
            </div>
            <div style={{ opacity: 0.8, marginTop: 10 }}>
              Thank you for becoming a Private Vault Member with us at ManifestBank™. We would like to extend a warm
              welcome with your first account Deposit!
            </div>
            {welcomeError ? (
              <div style={{ marginTop: 12, fontSize: 12, color: '#7a2e2e' }}>
                {welcomeError}
              </div>
            ) : null}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="solid" onClick={claimWelcome} disabled={claimingWelcome}>
                {claimingWelcome ? 'Accepting…' : 'Accept'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function BalanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function RiskPill({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles: Record<string, React.CSSProperties> = {
    low: {
      border: '1px solid rgba(31, 107, 88, 0.5)',
      color: '#1f6b58',
      background: 'rgba(31, 107, 88, 0.12)',
    },
    medium: {
      border: '1px solid rgba(182, 121, 103, 0.5)',
      color: '#7b5144',
      background: 'rgba(182, 121, 103, 0.12)',
    },
    high: {
      border: '1px solid rgba(178, 76, 76, 0.5)',
      color: '#7a2e2e',
      background: 'rgba(178, 76, 76, 0.16)',
    },
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        ...(styles[level] ?? styles.low),
      }}
    >
      {level.toUpperCase()}
    </span>
  )
}

function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => i)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {pieces.map((i) => {
        const left = (i * 100) / pieces.length
        const delay = (i % 6) * 0.2
        const size = 6 + (i % 5)
        const colors = ['#f9f2ea', '#b67967', '#d8b3a1', '#ffffff']
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-10%',
              width: size,
              height: size * 2,
              background: colors[i % colors.length],
              borderRadius: 999,
              opacity: 0.9,
              animation: `confettiFall 2.8s ease ${delay}s infinite`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(120%) rotate(220deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
