import Navbar from '@/app/components/Navbar'

export default function OpenRolesPage() {
  return (
    <main>
      <Navbar />
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600 }}>
          We’re growing deliberately. New listings coming soon!
        </div>
      </section>
    </main>
  )
}
