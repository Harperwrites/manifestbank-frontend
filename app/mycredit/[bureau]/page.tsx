'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'

const pageStyles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, rgba(246, 238, 230, 0.9), rgba(249, 245, 240, 0.95))',
    color: '#3b2b24',
  },
  container: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '8px 20px 60px',
    display: 'grid',
    gap: 18,
  },
  card: {
    borderRadius: 20,
    border: '1px solid rgba(140, 92, 78, 0.25)',
    background: 'rgba(255, 255, 255, 0.92)',
    padding: 18,
    boxShadow: '0 14px 32px rgba(18, 12, 10, 0.12)',
  },
  pillButton: {
    borderRadius: 999,
    border: '1px solid rgba(140, 92, 78, 0.35)',
    background: 'rgba(255,255,255,0.9)',
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    color: '#3b2b24',
    cursor: 'pointer',
  },
}

function Sparkline({ values }: { values: number[] }) {
  const safe = values.length ? values : [0]
  const max = Math.max(...safe, 1)
  const min = Math.min(...safe, 0)
  const range = max - min || 1
  const points = safe
    .map((val, idx) => {
      const x = (idx / (safe.length - 1 || 1)) * 240
      const y = 60 - ((val - min) / range) * 50
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width="240" height="70" viewBox="0 0 240 70">
      <polyline
        points={points}
        fill="none"
        stroke="rgba(140, 92, 78, 0.85)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: 'drawLine 1.2s ease forwards' }}
      />
      <style>
        {`@keyframes drawLine { to { stroke-dashoffset: 0; } }`}
      </style>
    </svg>
  )
}

export default function BureauDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bureau = Array.isArray(params?.bureau) ? params.bureau[0] : (params?.bureau as string)
  const [detail, setDetail] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])
  const [expandedAction, setExpandedAction] = useState<number | null>(null)
  const [rangeDays, setRangeDays] = useState(7)
  const [navClearance, setNavClearance] = useState(180)
  const [navReady, setNavReady] = useState(false)

  const title = useMemo(() => {
    if (!bureau) return 'Bureau'
    if (bureau === 'iab') return 'Identity Assurance Bureau'
    if (bureau === 'emotional-reserve') return 'The Emotional Reserve'
    if (bureau === 'ctb') return 'Cognitive Thought Bureau'
    return bureau
  }, [bureau])

  useEffect(() => {
    let active = true
    if (!bureau) return
    api
      .get(`/credit/bureau/${bureau}?days=${rangeDays}`)
      .then((res) => {
        if (!active) return
        setDetail(res.data)
      })
      .catch(() => {
        if (!active) return
        setDetail(null)
      })
    api
      .get(`/credit/actions?bureau=${title === 'Identity Assurance Bureau' ? 'IAB' : title === 'The Emotional Reserve' ? 'Emotional Reserve' : 'CTB'}`)
      .then((res) => {
        if (!active) return
        setActions(res.data || [])
      })
      .catch(() => {
        if (!active) return
        setActions([])
      })
    return () => {
      active = false
    }
  }, [bureau, rangeDays, title])

  useLayoutEffect(() => {
    let stableTimer = 0
    let frame = 0
    let observer: ResizeObserver | null = null

    function updateNavClearance() {
      const navbar = document.querySelector('.mb-navbar') as HTMLElement | null
      const measuredHeight = Math.ceil(navbar?.getBoundingClientRect().height ?? 160)
      setNavClearance(measuredHeight + 10)
      window.clearTimeout(stableTimer)
      stableTimer = window.setTimeout(() => setNavReady(true), 80)

      if (observer || !navbar || typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver(() => {
        const nextHeight = Math.ceil(navbar.getBoundingClientRect().height || 160)
        setNavClearance(nextHeight + 10)
        window.clearTimeout(stableTimer)
        stableTimer = window.setTimeout(() => setNavReady(true), 80)
      })
      observer.observe(navbar)
    }

    setNavReady(false)
    updateNavClearance()
    frame = window.requestAnimationFrame(updateNavClearance)
    window.addEventListener('resize', updateNavClearance)
    return () => {
      if (observer) observer.disconnect()
      window.clearTimeout(stableTimer)
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateNavClearance)
    }
  }, [])

  async function pinAction(actionId: number) {
    try {
      await api.post('/credit/todos', { action_id: actionId })
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 403 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paywall:open', { detail: { reason: detail } }))
        return
      }
      throw err
    }
  }

  async function dismissAction(actionId: number) {
    await api.delete(`/credit/todos/by-action/${actionId}`)
    setActions((prev) => prev.filter((item) => item.id !== actionId))
  }

  return (
    <main
      style={{ ...pageStyles.page, ['--credit-nav-clearance' as any]: `${navClearance}px` }}
      className="credit-bureau-page"
    >
      <style>{`
        .credit-bureau-page .mb-navbar-spacer {
          height: var(--credit-nav-clearance, 180px) !important;
        }
        @media (min-width: 768px) {
          .credit-bureau-container {
            padding-top: 18px !important;
          }
        }
      `}</style>
      <Navbar />
      <div style={{ visibility: navReady ? 'visible' : 'hidden' }}>
        <section
          style={pageStyles.container}
          className="credit-bureau-container"
        >
        <button
          type="button"
          data-testid="credit-bureau-back-button"
          onClick={() => router.back()}
          style={pageStyles.pillButton}
        >
          ← Back
        </button>
        <div style={pageStyles.card}>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>
            Bureau Detail
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, marginTop: 8 }}>{title}</div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{detail?.score ?? 700}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Score</div>
            </div>
            <Sparkline values={detail?.trend || []} />
            <div style={{ display: 'flex', gap: 6 }}>
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  style={{
                    ...pageStyles.pillButton,
                    background: rangeDays === days ? 'rgba(140, 92, 78, 0.2)' : 'rgba(255,255,255,0.9)',
                  }}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>{detail?.drivers?.[0]}</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{detail?.drivers?.[1]}</div>
        </div>

        <div style={pageStyles.card}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Bureau Focus</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
            {actions.map((action) => {
              const expanded = expandedAction === action.id
              return (
                <div
                  data-testid="bureau-action-card"
                  key={action.id}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(140, 92, 78, 0.2)',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.7)',
                    display: 'grid',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedAction(expanded ? null : action.id)}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{action.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{action.description}</div>
                  {expanded ? (
                    <div
                      style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        style={pageStyles.pillButton}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (action.action_route) window.location.href = action.action_route
                        }}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        data-testid="bureau-pin-button"
                        style={pageStyles.pillButton}
                        onClick={async (event) => {
                          event.stopPropagation()
                          await pinAction(action.id)
                        }}
                      >
                        Pin
                      </button>
                      <button
                        type="button"
                        style={pageStyles.pillButton}
                        onClick={(event) => {
                          event.stopPropagation()
                          dismissAction(action.id)
                        }}
                      >
                        No thanks
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
        </section>
      </div>
    </main>
  )
}
