'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { api } from '@/lib/api'
import { formatLocalDateTime, parseServerDate } from '@/lib/time'

export default function MyCreditReportPage() {
  const router = useRouter()
  const [navClearance, setNavClearance] = useState(180)
  const [navReady, setNavReady] = useState(false)
  const [items, setItems] = useState<
    {
      action_id: number
      title: string
      primary_bureau: string
      completed_at: string
      points: number
      action_type?: string | null
    }[]
  >([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'IAB' | 'Emotional Reserve' | 'CTB'>('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [rangeDays, setRangeDays] = useState<0 | 7 | 30 | 90>(0)

  useEffect(() => {
    let active = true
    api
      .get('/credit/report')
      .then((res) => {
        if (!active) return
        setItems(res.data?.items || [])
      })
      .catch((err) => {
        if (!active) return
        setError(err?.response?.data?.detail ?? 'Unable to load report.')
      })
    return () => {
      active = false
    }
  }, [])

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

  const filtered = useMemo(() => {
    let rows = [...items]
    if (filter !== 'all') {
      rows = rows.filter((item) => item.primary_bureau === filter)
    }
    if (rangeDays) {
      const since = Date.now() - rangeDays * 24 * 60 * 60 * 1000
      rows = rows.filter((item) => (parseServerDate(item.completed_at)?.getTime() ?? 0) >= since)
    }
    rows.sort((a, b) => {
      const aTime = parseServerDate(a.completed_at)?.getTime() ?? 0
      const bTime = parseServerDate(b.completed_at)?.getTime() ?? 0
      return sort === 'newest' ? bTime - aTime : aTime - bTime
    })
    return rows
  }, [items, filter, sort, rangeDays])

  return (
    <main
      className="credit-report-page"
      style={{
        minHeight: '100vh',
        background: 'rgba(249, 245, 240, 0.96)',
        color: '#3b2b24',
        ['--credit-nav-clearance' as any]: `${navClearance}px`,
      }}
    >
      <style>{`
        .credit-report-page .mb-navbar-spacer {
          height: var(--credit-nav-clearance, 180px) !important;
        }
        @media (min-width: 768px) {
          .credit-report-top {
            padding-top: 18px !important;
          }
          .credit-report-body {
            padding-top: 32px !important;
          }
        }
      `}</style>
      <Navbar showAccountsDropdown />
      <div style={{ visibility: navReady ? 'visible' : 'hidden' }}>
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '8px 24px 0' }} className="credit-report-top">
        <button
          type="button"
          data-testid="credit-report-back-button"
          onClick={() => router.back()}
          style={{
            borderRadius: 999,
            border: '1px solid rgba(140, 92, 78, 0.35)',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#3b2b24',
            background: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          ← Back
        </button>
      </section>
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 32px' }} className="credit-report-body">
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>
          ManifestBank Composite Credit Report
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, margin: '8px 0 12px' }}>My Credit Report</h1>
        {error ? <div style={{ color: '#7a2e2e' }}>{error}</div> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {(['all', 'IAB', 'Emotional Reserve', 'CTB'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              style={{
                borderRadius: 999,
                border: '1px solid rgba(140, 92, 78, 0.35)',
                padding: '4px 10px',
                fontSize: 12,
                background: filter === tab ? 'rgba(140, 92, 78, 0.2)' : 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
              }}
            >
              {tab === 'all' ? 'All' : tab}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <label style={{ fontSize: 12 }}>
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
              style={{ marginLeft: 6 }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            Range
            <select
              value={String(rangeDays)}
              onChange={(e) => setRangeDays(Number(e.target.value) as 0 | 7 | 30 | 90)}
              style={{ marginLeft: 6 }}
            >
              <option value="0">All time</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </label>
        </div>
        {!filtered.length ? (
          <div style={{ opacity: 0.7 }}>No completed actions yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {filtered.map((item) => (
              <div
                key={`${item.action_id}-${item.completed_at}`}
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(140, 92, 78, 0.25)',
                  background: 'rgba(255,255,255,0.9)',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{item.primary_bureau}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'right' }}>
                  <div>{formatLocalDateTime(item.completed_at)}</div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: item.points < 0 ? '#9f3a33' : '#6b3b2c',
                    }}
                  >
                    {item.points > 0 ? '+' : ''}
                    {item.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </div>
    </main>
  )
}
