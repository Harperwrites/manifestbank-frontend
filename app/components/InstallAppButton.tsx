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

function isAndroid() {
  if (typeof window === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function isEdge() {
  if (typeof window === 'undefined') return false
  return /Edg|EdgiOS/i.test(navigator.userAgent)
}

function isChromeFamily() {
  if (typeof window === 'undefined') return false
  return /Chrome|Chromium|CriOS|Brave/i.test(navigator.userAgent) && !isEdge()
}

function installGuide(ios: boolean, safari: boolean, android: boolean, edge: boolean, chromeFamily: boolean) {
  if (ios && safari) {
    return {
      badge: 'Safari on iPhone / iPad',
      heading: 'On iPhone and iPad Safari, installation is manual:',
      steps: ['Tap the Share button.', 'Select “Add to Home Screen”.', 'Tap “Add” to install.'],
      image: '/safari-install-guide.svg',
      glyph: '↗',
    }
  }
  if (ios) {
    return {
      badge: 'iPhone / iPad via Safari',
      heading: 'On iPhone and iPad, app install is completed through Safari:',
      steps: ['Open this page in Safari.', 'Tap the Share button.', 'Select “Add to Home Screen”, then tap “Add”.'],
      image: '/safari-install-guide.svg',
      glyph: '□',
    }
  }
  if (android && chromeFamily) {
    return {
      badge: 'Android Chrome',
      heading: 'On Android Chrome, install from the browser menu:',
      steps: ['Tap the three-dot menu.', 'Choose “Install app” or “Add to Home screen”.', 'Confirm to install.'],
      image: null,
      glyph: '⋮',
    }
  }
  if (edge) {
    return {
      badge: 'Microsoft Edge',
      heading: 'On Microsoft Edge, install from the browser menu:',
      steps: ['Open the three-dot menu.', 'Choose “Apps” → “Install this site as an app”.', 'Confirm to install.'],
      image: null,
      glyph: '⊞',
    }
  }
  if (chromeFamily) {
    return {
      badge: 'Chrome',
      heading: 'On Chrome, install from the address bar or browser menu:',
      steps: ['Click the install icon in the address bar if it appears.', 'Or open the browser menu.', 'Choose “Install ManifestBank™ App”.'],
      image: null,
      glyph: '⌄',
    }
  }
  if (safari) {
    return {
      badge: 'Mac Safari',
      heading: 'On Mac Safari, installation is manual:',
      steps: ['Open the File menu.', 'Select “Add to Dock”.', 'Confirm to install.'],
      image: null,
      glyph: '⌘',
    }
  }
  return {
    badge: 'Browser Support',
    heading: 'Install availability depends on your browser:',
    steps: [
      'If you use Chrome or Edge, open the browser menu and look for the install app option.',
      'If you are on iPhone or iPad, open this page in Safari.',
      'If no install option appears, your browser may not support app install here yet.',
    ],
    image: null,
    glyph: '?',
  }
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
  const [guideOpen, setGuideOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const bodyLockRef = useRef<{ overflow: string; touchAction: string } | null>(null)

  const ios = useMemo(() => isIOS(), [])
  const safari = useMemo(() => isSafari(), [])
  const android = useMemo(() => isAndroid(), [])
  const edge = useMemo(() => isEdge(), [])
  const chromeFamily = useMemo(() => isChromeFamily(), [])
  const guide = useMemo(() => installGuide(ios, safari, android, edge, chromeFamily), [ios, safari, android, edge, chromeFamily])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)
    if (isStandalone()) {
      return
    }
    const handleAvailable = () => {
      const prompt = (window as any).__mb_deferredInstallPrompt
      if (prompt) setNotice('')
    }
    window.addEventListener('mb-install-available', handleAvailable)
    handleAvailable()
    return () => window.removeEventListener('mb-install-available', handleAvailable)
  }, [])

  useEffect(() => {
    if (!guideOpen) {
      if (bodyLockRef.current) {
        document.body.style.overflow = bodyLockRef.current.overflow
        document.body.style.touchAction = bodyLockRef.current.touchAction
        bodyLockRef.current = null
      }
      return
    }
    if (typeof document === 'undefined') return
    if (!bodyLockRef.current) {
      bodyLockRef.current = {
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction,
      }
    }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    return () => {
      if (bodyLockRef.current) {
        document.body.style.overflow = bodyLockRef.current.overflow
        document.body.style.touchAction = bodyLockRef.current.touchAction
        bodyLockRef.current = null
      }
    }
  }, [guideOpen])

  if (!mounted || isStandalone()) return null

  const guideModal =
    guideOpen && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => {
              setGuideOpen(false)
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
                  onClick={() => setGuideOpen(false)}
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
              <div
                style={{
                  marginTop: 12,
                  padding: '14px 14px 16px',
                  borderRadius: 16,
                  border: '1px solid rgba(122, 89, 73, 0.28)',
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(244, 228, 219, 0.92))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: 'rgba(107, 71, 59, 0.1)',
                        color: '#6b473b',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.22,
                        textTransform: 'uppercase',
                      }}
                    >
                      {guide.badge}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>{guide.heading}</div>
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 18,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(231, 206, 193, 0.95) 58%, rgba(186, 132, 111, 0.95))',
                      color: '#6b473b',
                      fontSize: 28,
                      boxShadow: '0 10px 24px rgba(96, 62, 46, 0.18)',
                    }}
                  >
                    {guide.glyph}
                  </div>
                </div>
                {!guide.image ? (
                  <div
                    aria-hidden="true"
                    style={{
                      marginTop: 14,
                      padding: 14,
                      borderRadius: 14,
                      border: '1px solid rgba(95, 74, 62, 0.16)',
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(248, 239, 233, 0.92))',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'rgba(107, 71, 59, 0.08)',
                        fontSize: 12,
                        color: '#6b473b',
                        fontWeight: 600,
                      }}
                    >
                      <span>ManifestBank™</span>
                      <span>{guide.glyph}</span>
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {guide.steps.map((step, index) => (
                        <div
                          key={step}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '24px 1fr',
                            gap: 10,
                            alignItems: 'start',
                            fontSize: 12,
                            color: '#5f3f35',
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              display: 'grid',
                              placeItems: 'center',
                              background: 'rgba(182, 121, 103, 0.14)',
                              fontWeight: 700,
                            }}
                          >
                            {index + 1}
                          </div>
                          <div>{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <ol style={{ marginTop: 14, paddingLeft: 18, fontSize: 13, color: '#5f3f35' }}>
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {guide.image ? (
                <img
                  src={guide.image}
                  alt="Install guide"
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid rgba(95, 74, 62, 0.25)',
                    background: 'rgba(255,255,255,0.85)',
                    marginTop: 12,
                  }}
                />
              ) : null}
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Works offline • No App Store needed • Instant install
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
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
          const prompt = (window as any).__mb_deferredInstallPrompt
          if (prompt && !(ios || safari)) {
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
            ;(window as any).__mb_deferredInstallPrompt = null
            return
          }
          setGuideOpen(true)
          if (!prompt && !(ios || safari)) {
            setNotice('Use the steps in the install guide for this browser.')
            return
          }
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

      {guideModal}
    </div>
  )
}
