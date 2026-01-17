'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch {
        // silent on purpose
      }
    }
    register()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: Event) => {
      const promptEvent = event as any
      promptEvent.preventDefault?.()
      ;(window as any).__mb_deferredInstallPrompt = promptEvent
      window.dispatchEvent(new Event('mb-install-available'))
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
    if (!standalone) return
    const key = 'manifestbank_standalone_tracked'
    if (window.localStorage.getItem(key)) return
    const installIdKey = 'manifestbank_install_id'
    let installId = window.localStorage.getItem(installIdKey)
    if (!installId) {
      installId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(installIdKey, installId)
    }
    window.localStorage.setItem(key, '1')
    import('@/lib/api')
      .then(({ api }) =>
        api.post('/pwa/track', {
          install_id: installId,
          event_type: 'standalone_launch',
          platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'web',
          user_agent: navigator.userAgent,
        })
      )
      .catch(() => {})
  }, [])

  return null
}
