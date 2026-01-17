'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/app/components/Navbar'
import { useAuth } from '@/app/providers'
import { api } from '@/lib/api'

export default function AdminPage() {
  const router = useRouter()
  const { me, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!me || me.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [isLoading, me, router])

  async function testAdmin() {
    const res = await api.get('/admin/heartbeat')
    alert(res.data.status)
  }

  if (isLoading || !me) return null

  return (
    <main>
      <Navbar />
      <div style={{ padding: 40 }}>
        <h1>Admin Control Panel</h1>
        <p>Role: <b>{me.role}</b></p>

        <button
          onClick={testAdmin}
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 10,
            border: '1px solid #444',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          Test Admin Endpoint
        </button>
      </div>
    </main>
  )
}
