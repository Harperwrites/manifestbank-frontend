'use client'

import { useRouter } from 'next/navigation'
import { Button, Card } from '@/app/components/ui'
import { Navbar } from '@/app/components/ui/Navbar'

export default function SuccessPage() {
  const router = useRouter()

  return (
    <main>
      <Navbar sticky={false} />
      <div style={{ maxWidth: 520, margin: '90px auto', padding: 24 }}>
        <Card title="✅ You’re in" tone="soft">
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
            Your ManifestBank™ membership is active.
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 16 }}>
            You can now access your tools and begin. Take a slow breath — you’re supported here.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="solid" onClick={() => router.push('/dashboard')}>
              Enter ManifestBank
            </Button>
          </div>
        </Card>
      </div>
    </main>
  )
}
