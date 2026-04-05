'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/app/providers'

type OpenTask = {
  actionId: number
  title: string
  bureau: string
  actionType?: string | null
  openedAt?: string
}

type CompletionToast = {
  title: string
  bureau: string
  points: number
}

type CreditReportItem = {
  action_id: number
  title: string
  primary_bureau: string
  points: number
  action_type?: string | null
  completed_at: string
}

function getCompletionStorageKey(userId: number | null | undefined) {
  return `mb_task_completion_toasts:${userId ?? 'anon'}`
}

function getShownCompletionKeys(userId: number | null | undefined): Set<string> {
  if (typeof window === 'undefined') return new Set()
  const raw = window.sessionStorage.getItem(getCompletionStorageKey(userId))
  if (!raw) return new Set()
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((item) => typeof item === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function markCompletionShown(userId: number | null | undefined, key: string) {
  if (typeof window === 'undefined') return
  const next = getShownCompletionKeys(userId)
  next.add(key)
  window.sessionStorage.setItem(getCompletionStorageKey(userId), JSON.stringify(Array.from(next)))
}

function getStoredOpenTask(): OpenTask | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem('mb_open_task')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.actionId) return parsed
  } catch {
    // ignore
  }
  return null
}

export default function OpenTaskToast() {
  const { me } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [openTask, setOpenTask] = useState<OpenTask | null>(() => getStoredOpenTask())
  const [completion, setCompletion] = useState<CompletionToast | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const clearTaskUi = () => {
      window.sessionStorage.removeItem('mb_open_task')
      setOpenTask(null)
      setCompletion(null)
    }
    const token = window.localStorage.getItem('access_token') || window.sessionStorage.getItem('access_token')
    if (!token) {
      clearTaskUi()
      return
    }
    const loadOpenTask = () => {
      const activeToken = window.localStorage.getItem('access_token') || window.sessionStorage.getItem('access_token')
      if (!activeToken) {
        clearTaskUi()
        return
      }
      const parsed = getStoredOpenTask()
      setOpenTask((prev) => {
        const prevKey = prev ? JSON.stringify(prev) : null
        const nextKey = parsed ? JSON.stringify(parsed) : null
        if (prevKey === nextKey) return prev
        return parsed
      })
    }
    loadOpenTask()
    const onSet = () => loadOpenTask()
    const onCheck = () => loadOpenTask()
    const onLoggedOut = () => clearTaskUi()
    window.addEventListener('mb_open_task_set', onSet)
    window.addEventListener('mb_task_completed_check', onCheck)
    window.addEventListener('auth:logged_out', onLoggedOut)
    const poll = window.setInterval(loadOpenTask, 4000)
    return () => {
      window.removeEventListener('mb_open_task_set', onSet)
      window.removeEventListener('mb_task_completed_check', onCheck)
      window.removeEventListener('auth:logged_out', onLoggedOut)
      window.clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    if (me) return
    setOpenTask(null)
    setCompletion(null)
  }, [me])

  useEffect(() => {
    if (!openTask || !me) return
    let active = true
    const openedAtMs = Date.parse(openTask.openedAt ?? '')
    const minimumCompletedAt = Number.isFinite(openedAtMs) ? openedAtMs : Date.now()
    const interval = window.setInterval(async () => {
      try {
        const res = await api.get('/credit/report')
        const items: CreditReportItem[] = Array.isArray(res.data?.items) ? res.data.items : []
        const match = items.find((item: CreditReportItem) => {
          const completionKey = `${item.action_id}:${item.completed_at}`
          if (getShownCompletionKeys(me.id).has(completionKey)) return false
          const completedAtMs = Date.parse(item.completed_at)
          if (!Number.isFinite(completedAtMs) || completedAtMs < minimumCompletedAt) return false
          if (item.action_id === openTask.actionId) return true
          if (openTask.actionType && item.action_type) return item.action_type === openTask.actionType
          return item.title === openTask.title
        })
        if (!active || !match) return
        if (openTask.actionType && openTask.actionType === 'teller_message') {
          const threadId = window.sessionStorage.getItem('mb_teller_thread')
          if (threadId) {
            const messageRes = await api.get(`/teller/threads/${threadId}/messages`)
            const list = Array.isArray(messageRes.data) ? messageRes.data : []
            const assistant = list.filter((m) => m.role === 'assistant')
            if (assistant.length === 0) return
          }
        }
        markCompletionShown(me.id, `${match.action_id}:${match.completed_at}`)
        setOpenTask(null)
        window.sessionStorage.removeItem('mb_open_task')
        setCompletion({
          title: match.title,
          bureau: match.primary_bureau,
          points: Number(match.points || 1),
        })
      } catch {
        // ignore
      }
    }, 8000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [me, openTask])

  // completion toast stays until closed by user

  if (!mounted || !me) return null
  if (!openTask && !completion) return null

  return (
    <>
      {openTask ? (
        <div
          style={{
            position: 'fixed',
            top: 96,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(255,255,255,0.98)',
            border: '1px solid rgba(120, 170, 130, 0.35)',
            borderRadius: 14,
            padding: '10px 16px',
            boxShadow: '0 16px 30px rgba(34, 20, 14, 0.16)',
            color: '#2f4a32',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 'min(90vw, 520px)',
          }}
        >
          <span style={{ fontWeight: 700 }}>Open task reminder:</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{openTask.title}</span>
          <button
            type="button"
            onClick={() => {
              setOpenTask(null)
              if (typeof window !== 'undefined') window.sessionStorage.removeItem('mb_open_task')
            }}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 16,
              opacity: 0.7,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
      {completion ? (
        <div
          style={{
            position: 'fixed',
            top: openTask ? 140 : 96,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'rgba(255,255,255,0.98)',
            border: '1px solid rgba(120, 170, 130, 0.5)',
            borderRadius: 14,
            padding: '10px 16px',
            boxShadow: '0 16px 30px rgba(34, 20, 14, 0.16)',
            color: '#2f4a32',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 'min(90vw, 520px)',
          }}
        >
          <span style={{ fontWeight: 700 }}>Completed</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {completion.title} · +{completion.points} {completion.bureau}
          </span>
          <button
            type="button"
            onClick={() => setCompletion(null)}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 16,
              opacity: 0.7,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  )
}
