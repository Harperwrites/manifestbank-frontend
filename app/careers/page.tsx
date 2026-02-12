'use client'

import Navbar from '@/app/components/Navbar'

export default function CareersPage() {
  return (
    <main>
      <Navbar />
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32 }}>Careers</div>
        <p style={{ marginTop: 12, opacity: 0.75 }}>Check back soon.</p>
      </section>
    </main>
  )
}
