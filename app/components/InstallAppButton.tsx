'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/lib/api'

const DISMISS_KEY = 'manifestbank_install_dismissed'

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

function isSafari() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isSafariBrowser = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|Brave|FxiOS/i.test(ua)
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

  const iosModal =
    iosOpen && mounted
      ? createPortal(
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
              background: 'rgba(12, 8, 6, 0.92)',
              zIndex: 2147483647,
              display: 'grid',
              placeItems: 'center',
              padding: 16,
              height: '100svh',
              minHeight: '100svh',
              width: '100vw',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              pointerEvents: 'auto',
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
                  'linear-gradient(145deg, rgba(246, 230, 220, 0.98), rgba(220, 193, 179, 0.98) 45%, rgba(255, 255, 255, 0.95))',
                boxShadow: '0 28px 60px rgba(96, 62, 46, 0.4)',
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Install ManifestBank™ App</div>
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
                {ios
                  ? safari
                    ? 'On iPhone and iPad Safari, installation is manual:'
                    : 'On iPhone and iPad, app install is completed through Safari:'
                  : 'On Mac Safari, installation is manual:'}
              </div>
              <ol style={{ marginTop: 10, paddingLeft: 18, fontSize: 13, color: '#5f3f35' }}>
                {ios && safari ? (
                  <>
                    <li>Tap the Share button.</li>
                    <li>Select “Add to Home Screen”.</li>
                    <li>Tap “Add” to install.</li>
                  </>
                ) : ios ? (
                  <>
                    <li>Open this page in Safari.</li>
                    <li>Tap the Share button.</li>
                    <li>Select “Add to Home Screen”, then tap “Add”.</li>
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
          </div>,
          document.body
        )
      : null

  return (
    <div style={{ position: 'relative' }}>
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
          padding: '9px 16px',
          borderRadius: 999,
          border: '1px solid rgba(182, 121, 103, 0.42)',
          background:
            'linear-gradient(145deg, rgba(249, 241, 235, 0.95), rgba(232, 210, 198, 0.98))',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: 0.18,
          color: '#6b473b',
          boxShadow: '0 8px 18px rgba(96, 62, 46, 0.12)',
          whiteSpace: 'nowrap',
        }}
        aria-label="Install ManifestBank™ app"
      >
        Get ManifestBank™ App
      </button>
      {notice ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            maxWidth: 220,
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid rgba(182, 121, 103, 0.22)',
            background: 'rgba(255, 249, 245, 0.96)',
            color: '#7b5144',
            fontSize: 11,
            boxShadow: '0 14px 28px rgba(96, 62, 46, 0.12)',
          }}
        >
          {notice}
        </div>
      ) : null}

      {iosModal}
    </div>
  )
}
