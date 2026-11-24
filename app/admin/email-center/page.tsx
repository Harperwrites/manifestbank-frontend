'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'
import './email-center.css'

type Recipient = { user_id: number; email: string; status: string }
type Job = { id: string; status: string; note: string; requested: number; sender: string; counts: Record<string, number>; recipients: Recipient[]; approved_at?: string; resume_at?: string }
type Sender = { name: string; email: string; selected: boolean; daily_limit: number | null; reserve: number }
type Overview = { active: boolean; active_sender: string; ends_at: string; campaign_counts: Record<string, number>; quota: { used: number; confirmed: boolean; source: string; utc_day: string; queue_cap: number; allowance: number; reset_at: string }; senders: Sender[]; jobs: Job[]; audience: { status: string; eligible?: number; excluded?: number; errors?: number; checked_at: string } | null; audit: { action: string; detail: string; at: string }[] }
const label = (s: string) => s.replaceAll('_', ' ')
const date = (s: string) => new Date(s).toLocaleString()

export default function EmailCenter() {
  const { me, isLoading } = useAuth()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [count, setCount] = useState(75)
  const [used, setUsed] = useState('')
  const [confirmedUsage, setConfirmedUsage] = useState(false)
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null)
  const [review, setReview] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { const { data: next } = await api.get('/admin/email-center'); setData(next) }
    catch (e: unknown) { setError((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Could not load the email center. Please retry.') }
  }, [])
  useEffect(() => {
    if (isLoading || me?.role !== 'admin') return
    void load()
    const timer = window.setInterval(() => { if (!document.hidden) void load() }, 5000)
    return () => clearInterval(timer)
  }, [isLoading, me?.role, load])
  async function action(path: string, payload?: unknown) {
    setBusy(path); setError('')
    try { await api.post('/admin/email-center' + path, payload); setReview(null); await load() }
    catch (e: unknown) { setError((e as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Action could not be completed. Refresh the status before trying again.') }
    finally { setBusy('') }
  }
  async function downloadGuide() {
    setBusy('guide')
    try { const result = await api.get('/admin/email-center/guide', { responseType: 'blob' }); const url = URL.createObjectURL(result.data); const a = document.createElement('a'); a.href = url; a.download = 'ManifestBank-Email-Center-Guide.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch { setError('The guide could not be downloaded. Please retry.') }
    finally { setBusy('') }
  }
  if (isLoading) return <><Navbar /><main className="email-center"><p>Checking admin access...</p></main></>
  if (me?.role !== 'admin') return <><Navbar /><main className="email-center"><h1>Admin access required</h1><p>This workspace is available to ManifestBank administrators.</p><Link href="/dashboard">Return to ManifestBank</Link></main></>
  const current = data?.jobs.find(j => !['completed', 'cancelled', 'expired'].includes(j.status))
  return <><Navbar /><main className="email-center">
    <header className="ec-header"><div><Link href="/admin">Admin</Link><p className="ec-eyebrow">MANIFESTBANK OPERATIONS</p><h1>Email center</h1><p>Review your audience. Approve your message. Let the queue handle the daily allowance.</p></div><button onClick={() => void downloadGuide()} disabled={!!busy}>Download PDF guide</button></header>
    {error && <div className="ec-alert" role="alert">{error} <button onClick={() => { setError(''); void load() }}>Refresh</button></div>}
    {!data ? <p role="status">Loading sender and campaign records...</p> : <>
      <section className="ec-stats" aria-label="Campaign overview">
        <article><span>Accepted by Resend</span><strong>{data.campaign_counts.sent || 0}</strong><small>Provider accepted; inbox delivery is separate.</small></article>
        <article><span>Needs review</span><strong>{(data.campaign_counts.failed || 0) + (data.campaign_counts.unknown || 0) + (data.campaign_counts.pending || 0)}</strong><small>Rejected or uncertain attempts are never retried automatically.</small></article>
        <article><span>Eligible and unsent</span><strong>{data.audience?.status === 'complete' ? data.audience.eligible : '—'}</strong><small>{data.audience?.status === 'complete' ? 'Includes any recipients in unstarted batches. Checked ' + date(data.audience.checked_at) : 'Run a fresh membership check.'}</small><button onClick={() => void action('/audience/check')} disabled={!!busy || data.audience?.status === 'checking'}>{data.audience?.status === 'checking' ? 'Checking membership...' : 'Check remaining audience'}</button>{!!data.audience?.errors && <small role="alert">{data.audience.errors} checks could not be completed. Count is incomplete.</small>}</article>
      </section>
      <div className="ec-grid"><section className="ec-panel"><p className="ec-eyebrow">1 / DAILY ALLOWANCE</p><h2>Your campaign sender</h2><p><strong>{data.senders.find(s => s.selected)?.email}</strong></p><p className="ec-allowance">{data.quota.confirmed ? data.quota.allowance : '—'} <span>queue slots available today</span></p><p>Queue ceiling: {data.quota.queue_cap}/day after reserve. Provider limits also apply to mail sent outside this queue. The queue uses one sender and never rotates accounts to bypass a limit.</p><p>Next UTC reset: <strong>{date(data.quota.reset_at)}</strong></p><details open={!data.quota.confirmed}><summary>{data.quota.confirmed ? 'Update today’s usage from Resend' : 'Confirm existing usage before the first send'}</summary><p>Open Resend Usage and enter the total already used today. Include earlier campaigns and other email. This number can only increase within the same UTC day.</p><label>Total used today <input type="number" min={data.quota.used} max={1000000} value={used} onChange={e => setUsed(e.target.value)} placeholder="Enter Resend’s current used count" /></label><label className="ec-check"><input type="checkbox" checked={confirmedUsage} onChange={e => setConfirmedUsage(e.target.checked)} /> I checked this number in Resend.</label><button disabled={!!busy || !confirmedUsage || used === '' || Number(used) < data.quota.used} onClick={() => void action('/usage', { used: Number(used), utc_day: data.quota.utc_day })}>Confirm usage</button></details><small>{data.quota.source}</small><p><a href="https://resend.com/settings/usage" target="_blank" rel="noreferrer">Open Resend Usage ↗</a></p></section>
      <section className="ec-panel"><p className="ec-eyebrow">2 / PREVIEW AND APPROVE</p><h2>November Signature invitation</h2><p><strong>$22.22 first year, then $72/year.</strong> Code 1111 is already applied at checkout. The video is linked in the email.</p><p>Oldest eligible verified accounts first. Current Signature members, opt-outs, duplicate addresses and previously recorded deliveries are excluded.</p><label>Batch size <input type="number" min={1} max={75} value={count} onChange={e => setCount(Number(e.target.value))} /></label><button disabled={!!busy || !!current || !data.active || count < 1 || count > 75} onClick={() => void action('/batches', { count })}>Preview next batch</button><p>Previewing never sends email. Sending starts only after you review and approve the selected recipients.</p><button onClick={async () => { try { const r = await api.get('/admin/email-center/template'); setPreview(r.data) } catch { setError('Email preview is unavailable.') } }}>View email template</button>{!data.active && <p role="status">The November campaign has ended. Further sending is disabled.</p>}</section></div>
      {preview && <details className="ec-panel" open><summary>Email preview: {preview.subject}</summary><iframe title="November email preview" srcDoc={preview.html} sandbox="" style={{ width: '100%', height: 680, border: 0, marginTop: 16 }} /></details>}
      <section className="ec-panel"><p className="ec-eyebrow">3 / QUEUE</p><h2>Batches</h2><p>Approved mail waits when the allowance is exhausted, then resumes after the daily reset. The November end date still applies. Pause stops after any in-flight request finishes.</p>{!data.jobs.length && <p>No batches prepared yet. Your previous campaign delivery history remains preserved.</p>}{data.jobs.map(job => <article className="ec-job" key={job.id}><div className="ec-job-title"><h3>{label(job.status)}</h3><span>{job.id.slice(0, 8)}</span></div><p>{job.note}</p><div className="ec-pills">{Object.entries(job.counts).map(([key, n]) => <span key={key}>{label(key)}: <strong>{n}</strong></span>)}</div>{job.resume_at && job.status === 'waiting_quota' && <p>Next check: {date(job.resume_at)}</p>}<details><summary>Selected recipients ({job.recipients.length})</summary><div className="ec-table-wrap"><table><thead><tr><th>Account</th><th>Email</th><th>Status</th></tr></thead><tbody>{job.recipients.map(r => <tr key={r.user_id}><td>{r.user_id}</td><td>{r.email}</td><td>{label(r.status)}</td></tr>)}</tbody></table></div></details>{['ready','paused','waiting_quota','needs_usage'].includes(job.status) && <button disabled={!!busy || !data.active} onClick={() => setReview(job.id)}>{job.approved_at ? 'Review and resume' : 'Review and approve'}</button>}{['approved','running'].includes(job.status) && <button disabled={!!busy} onClick={() => void action('/batches/' + job.id + '/pause')}>Pause batch</button>}{!['completed','cancelled','expired'].includes(job.status) && <button disabled={!!busy} onClick={() => void action('/batches/' + job.id + '/cancel')}>Cancel remaining queue</button>}{review === job.id && <div className="ec-review" role="region" aria-label="Approve email batch"><h4>Approve this exact recipient group?</h4><p>This sends the November invitation to up to {job.recipients.filter(r => ['queued','deferred'].includes(r.status)).length} remaining recipients listed above. Eligibility and unsubscribe preferences are rechecked before dispatch. Messages may wait for the daily allowance; no later accounts will be substituted.</p><button disabled={!!busy} onClick={() => void action('/batches/' + job.id + '/send')}>Approve batch and send</button><button onClick={() => setReview(null)}>Keep reviewing</button></div>}</article>)}</section>
      <section className="ec-panel"><h2>Connected sender configuration</h2><p>Keys stay in Render. These addresses are the backend configuration; domain verification and delivery events are reviewed in Resend.</p><div className="ec-table-wrap"><table><thead><tr><th>Account</th><th>From address</th><th>Campaign use</th></tr></thead><tbody>{data.senders.map(s => <tr key={s.name}><td>{label(s.name)}</td><td>{s.email}</td><td>{s.selected ? 'Selected sender' : 'Inventory only'}</td></tr>)}</tbody></table></div><div className="ec-links"><a href="https://resend.com/domains" target="_blank" rel="noreferrer">Resend domains ↗</a><a href="https://resend.com/logs" target="_blank" rel="noreferrer">Resend logs ↗</a><a href="https://dashboard.render.com/web/srv-d5lvpikmrvns73eqecfg/env" target="_blank" rel="noreferrer">Render configuration ↗</a><a href="https://dash.cloudflare.com/c580c6628a387c50c73dbf82b6e80e9f/manifestbank.app/dns/records" target="_blank" rel="noreferrer">Cloudflare DNS ↗</a></div></section>
      <details className="ec-panel"><summary>Recent admin activity</summary>{data.audit.map((a, i) => <p key={i}><strong>{label(a.action)}</strong> · {date(a.at)}<br />{a.detail}</p>)}</details>
    </>}
  </main></>
}
