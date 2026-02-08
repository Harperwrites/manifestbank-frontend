'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MyStatementsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/mystatments')
  }, [router])

  return null
}
