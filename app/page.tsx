'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { useAuth } from '@/app/providers'

export default function Home() {
  const router = useRouter()
  const { me, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    router.replace(me ? '/dashboard' : '/auth')
  }, [isLoading, me, router])

  return (
    <main>
      <Navbar />
      <div style={{ padding: 40, fontSize: 18, opacity: 0.85 }}>
        {isLoading ? 'Checking session…' : 'Routing…'}
      </div>
    </main>
  )
}
