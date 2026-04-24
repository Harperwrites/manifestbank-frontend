import type { Metadata } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from './providers'
import PwaRegister from './components/PwaRegister'
import DevPaywallButton from './components/DevPaywallButton'
import MyTellerWidget from './components/MyTellerWidget'
import OpenTaskToast from './components/OpenTaskToast'

export const metadata: Metadata = {
  metadataBase: new URL('https://manifestbank.app'),
  title: {
    default: 'ManifestBank™',
    template: '%s | ManifestBank™',
  },
  description:
    'ManifestBank™ is a digital self-organization, reflection, and awareness platform designed to help users clarify intentions and align identity with conscious action.',
  manifest: '/manifestbank-v2.json?v=20260423a',
  openGraph: {
    title: 'ManifestBank™',
    description:
      'ManifestBank™ is a digital self-organization, reflection, and awareness platform designed to help users clarify intentions and align identity with conscious action.',
    url: 'https://manifestbank.app',
    siteName: 'ManifestBank™',
    type: 'website',
    images: [
      {
        url: '/manifestbank-icon-512.png?v=20260423a',
        width: 512,
        height: 512,
        alt: 'ManifestBank™',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ManifestBank™',
    description:
      'ManifestBank™ is a digital self-organization, reflection, and awareness platform designed to help users clarify intentions and align identity with conscious action.',
    images: ['/manifestbank-icon-512.png?v=20260423a'],
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/manifestbank-favicon-32.png?v=20260423a', sizes: '32x32', type: 'image/png' },
      { url: '/manifestbank-icon-192.png?v=20260423a', sizes: '192x192', type: 'image/png' },
      { url: '/manifestbank-icon-512.png?v=20260423a', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/manifestbank-apple-touch-icon.png?v=20260423a',
    shortcut: '/favicon.ico',
  },
}

export const viewport = {
  themeColor: '#b67967',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#b67967" />
        <meta
          name="google-site-verification"
          content="3Hy_gzBFWnWxPd4WgTZwn0qUl1oRzN_blbZS-jCH0Bs"
        />
        <link rel="icon" href="/favicon.ico" sizes="48x48" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/manifestbank-apple-touch-icon.png?v=20260423a" />
      </head>
      <body>
        <AuthProvider>
          <OpenTaskToast />
          <Script
            id="manifestbank-org"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'ManifestBank™',
                url: 'https://manifestbank.app',
                logo: 'https://manifestbank.app/manifestbank-icon-512.png?v=20260423a',
              }),
            }}
          />
          <Script
            id="manifestbank-website"
            type="application/ld+json"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'ManifestBank™',
                url: 'https://manifestbank.app',
              }),
            }}
          />
          {children}
          <DevPaywallButton />
          <MyTellerWidget />
          <footer
            style={{
              marginTop: 48,
              padding: '28px 20px 34px',
              borderTop: '1px solid rgba(95, 74, 62, 0.2)',
              background:
                'linear-gradient(180deg, rgba(247, 241, 236, 0.9), rgba(240, 231, 223, 0.9))',
              color: '#3b2a22',
            }}
          >
            <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>
                ManifestBank™
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/about" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  About us
                </Link>
                <Link href="/contact" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Contact us
                </Link>
                <Link href="/careers" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Careers
                </Link>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Terms &amp; Conditions
                </Link>
                <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Privacy Policy
                </Link>
              </div>
              <div style={{ marginTop: 6 }}>
                <Link href="/faq" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  FAQ
                </Link>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                © 2026 ManifestBank™. All rights reserved.
              </div>
            </div>
          </footer>
          <PwaRegister />
        </AuthProvider>
      </body>
    </html>
  )
}
