'use client'

import { useRouter } from 'next/navigation'
import { Button, Card } from '@/app/components/ui'
import Navbar from '@/app/components/Navbar'

export default function CancelPage() {
  const router = useRouter()

  return (
    <main>
      <Navbar sticky={false} />
      <div style={{ maxWidth: 520, margin: '90px auto', padding: 24 }}>
        <Card title="No charge was made." tone="soft">
          <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
            You can return anytime.
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 16 }}>
            If you’re not ready now, your space is still here when you are.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Back to ManifestBank
            </Button>
          </div>
        </Card>
      </div>
    </main>
  )
}
