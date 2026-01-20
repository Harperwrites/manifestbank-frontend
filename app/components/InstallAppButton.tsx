'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'

const DISMISS_KEY = 'manifestbank_install_dismissed'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

function isSafari() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isSafariBrowser = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave/i.test(ua)
  return isSafariBrowser
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
}

function getInstallId() {
  if (typeof window === 'undefined') return 'unknown'
  const key = 'manifestbank_install_id'
  let id = window.localStorage.getItem(key)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(key, id)
  }
  return id
}

export default function InstallAppButton() {
  const [mounted, setMounted] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [iosOpen, setIosOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [installStatus, setInstallStatus] = useState<'ready' | 'unsupported' | 'dismissed' | 'installed'>('ready')
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const iosBodyLockRef = useRef<{ overflow: string; touchAction: string } | null>(null)

  const ios = useMemo(() => isIOS(), [])
  const safari = useMemo(() => isSafari(), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)
    if (isStandalone()) {
      setInstallStatus('installed')
      return
    }
    const handleAvailable = () => {
      const prompt = (window as any).__mb_deferredInstallPrompt
      setCanInstall(Boolean(prompt))
      if (prompt) {
        setInstallStatus('ready')
      } else {
        setInstallStatus('unsupported')
      }
    }
    window.addEventListener('mb-install-available', handleAvailable)
    handleAvailable()
    return () => window.removeEventListener('mb-install-available', handleAvailable)
  }, [])

  useEffect(() => {
    if (!iosOpen) {
      if (iosBodyLockRef.current) {
        document.body.style.overflow = iosBodyLockRef.current.overflow
        document.body.style.touchAction = iosBodyLockRef.current.touchAction
        iosBodyLockRef.current = null
      }
      return
    }
    if (typeof document === 'undefined') return
    if (!iosBodyLockRef.current) {
      iosBodyLockRef.current = {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
      }
    }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      if (iosBodyLockRef.current) {
        document.body.style.overflow = iosBodyLockRef.current.overflow
        document.body.style.touchAction = iosBodyLockRef.current.touchAction
        iosBodyLockRef.current = null
      }
    }
  }, [iosOpen])

  if (!mounted || isStandalone()) return null

  const microcopy = 'Works offline • No App Store needed • Instant install'

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <button
        type="button"
        onClick={async () => {
          setNotice('')
          if (ios || safari) {
            setIosOpen(true)
            return
          }
          const prompt = (window as any).__mb_deferredInstallPrompt
          if (!prompt) {
            setInstallStatus('unsupported')
            setNotice('Install isn’t available right now.')
            return
          }
          prompt.prompt()
          const choice = await prompt.userChoice
          if (choice?.outcome === 'accepted') {
            setNotice('Installing…')
            const installId = getInstallId()
            api.post('/pwa/track', {
              install_id: installId,
              event_type: 'install_prompt_accepted',
              platform: ios ? 'ios' : safari ? 'safari' : 'web',
              user_agent: navigator.userAgent,
            }).catch(() => {})
          }
          if (choice?.outcome === 'dismissed') {
            setInstallStatus('dismissed')
          }
          ;(window as any).__mb_deferredInstallPrompt = null
          setCanInstall(false)
        }}
        style={{
          padding: '8px 14px',
          borderRadius: 999,
          border: '1px solid rgba(182, 121, 103, 0.6)',
          background:
            'linear-gradient(145deg, rgba(246, 230, 220, 0.95), rgba(220, 193, 179, 0.98))',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.2,
          color: '#5f3f35',
          boxShadow: '0 10px 20px rgba(96, 62, 46, 0.2)',
        }}
        aria-label="Install ManifestBank app"
      >
        Install ManifestBank App
      </button>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{microcopy}</div>
      {notice ? <div style={{ fontSize: 11, color: '#7b5144' }}>{notice}</div> : null}
      {!ios && !safari && installStatus !== 'ready' ? (
        <div style={{ fontSize: 11, opacity: 0.6 }}>
          {installStatus === 'installed'
            ? 'Already installed on this device.'
            : installStatus === 'dismissed'
            ? 'Install was dismissed. Try again later or use the browser menu.'
            : 'Install prompt not available yet. Try from the homepage or after a hard refresh.'}
        </div>
      ) : null}
      {!ios && !safari && installStatus !== 'ready' ? (
        <button
          type="button"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            fontSize: 11,
            color: '#6f4a3a',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          Why can’t I install?
        </button>
      ) : null}
      {showDiagnostics && !ios && !safari ? (
        <div style={{ fontSize: 11, opacity: 0.7 }}>
          {isStandalone()
            ? 'You’re already running the installed app.'
            : ios || safari
            ? 'Safari doesn’t support the install prompt. Use Share → Add to Home Screen (iOS) or File → Add to Dock (Mac).'
            : canInstall
            ? 'Install prompt is ready. Click Install ManifestBank App.'
            : 'Chrome hasn’t offered the install prompt yet. Try the homepage, hard refresh, or clear site data.'}
        </div>
      ) : null}

      {iosOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setIosOpen(false)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(DISMISS_KEY, '1')
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22, 16, 12, 0.35)',
            zIndex: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            height: '100dvh',
            minHeight: '100vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              width: '100%',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              borderRadius: 18,
              border: '1px solid rgba(122, 89, 73, 0.45)',
              background:
                'linear-gradient(145deg, rgba(246, 230, 220, 0.96), rgba(220, 193, 179, 0.98) 45%, rgba(255, 255, 255, 0.92))',
              boxShadow: '0 28px 60px rgba(96, 62, 46, 0.35)',
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Install ManifestBank App</div>
              <button
                type="button"
                onClick={() => setIosOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 16,
                  opacity: 0.6,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
              On Apple Safari, installation is manual:
            </div>
            <ol style={{ marginTop: 10, paddingLeft: 18, fontSize: 13, color: '#5f3f35' }}>
              {ios ? (
                <>
                  <li>Tap the Share button.</li>
                  <li>Select “Add to Home Screen”.</li>
                  <li>Tap “Add” to install.</li>
                </>
              ) : (
                <>
                  <li>Open the File menu.</li>
                  <li>Select “Add to Dock”.</li>
                  <li>Confirm to install.</li>
                </>
              )}
            </ol>
            <img
              src="/safari-install-guide.svg"
              alt="Install guide"
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid rgba(95, 74, 62, 0.25)',
                background: 'rgba(255,255,255,0.85)',
                marginTop: 12,
              }}
            />
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              Works offline • No App Store needed • Instant install
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setIosOpen(false)}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(122, 89, 73, 0.35)',
                  background: 'rgba(255,255,255,0.9)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
