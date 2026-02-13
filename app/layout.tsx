import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from './providers'
import PwaRegister from './components/PwaRegister'

export const metadata: Metadata = {
  title: 'ManifestBank™',
  description: 'ManifestBank™ App',
  manifest: '/manifestBank-v2.json?v=20260117b',
  themeColor: '#b67967',
  icons: {
    icon: '/ManifestBank%20Square%20App%20Logo.png?v=20260118a',
    apple: '/ManifestBank%20Square%20App%20Logo.png?v=20260118a',
  },
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
        <link rel="apple-touch-icon" href="/ManifestBank%20Square%20App%20Logo.png?v=20260118a" />
      </head>
      <body>
        <AuthProvider>
          {children}
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
