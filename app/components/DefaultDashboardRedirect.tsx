'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'

export default function DefaultDashboardRedirect() {
  const router = useRouter()
  const { me, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && me) {
      router.replace('/dashboard')
    }
  }, [isLoading, me, router])

  return null
}
