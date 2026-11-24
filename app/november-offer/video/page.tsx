import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'November Signature Offer | ManifestBank',
  description: 'Watch the November ManifestBank Signature promo. $22.22 for your first year; then $72/year unless canceled.',
}

export default function NovemberPromoVideo() {
  return <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px', color: '#3d2a24' }}>
    <Link href="/">ManifestBank™</Link>
    <p style={{ color: '#8b5147', letterSpacing: '.12em' }}>YOUR NOVEMBER INVITATION</p>
    <h1 style={{ fontFamily: 'Georgia, serif' }}>A year of possibility.</h1>
    <video controls playsInline preload="metadata" poster="/promos/november-2026/november-video-poster.jpg" style={{ width: '100%', borderRadius: 18, background: '#fffaf4' }} aria-label="November Signature membership promotional video with narration, background music and on-screen offer details">
      <source src="/promos/november-2026/november-signature-2222-narrated.mp4" type="video/mp4" />
      <p><a href="/promos/november-2026/november-signature-2222-narrated.mp4">Watch the November promo</a></p>
    </video>
    <p><strong>$22.22 for your first year.</strong> Then $72/year, renewing automatically unless canceled. Offer ends November 30, 2026 at 11:59 p.m. Central Time.</p>
    <p>For nonmembers only. Current monthly and annual subscribers are excluded. Applicable taxes appear at checkout.</p>
    <Link href="/november-offer" style={{ display: 'inline-block', padding: '14px 22px', borderRadius: 30, background: '#a75f52', color: 'white', textDecoration: 'none' }}>View your November offer</Link>
    <p>A product of Manifest Treasures LLC.</p>
    <p style={{ fontSize: 13 }}>ManifestBank is a reflection and wealth visualization platform. Financial activity is simulated. It is not a bank.</p>
  </main>
}
