import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './providers'
import PwaRegister from './components/PwaRegister'

export const metadata: Metadata = {
  title: 'ManifestBank',
  description: 'ManifestBank App',
  manifest: '/manifestBank-v2.json?v=20260117b',
  themeColor: '#b67967',
  icons: {
    icon: '/manifestbank-icon-512.png?v=20260117b',
    apple: '/manifestbank-icon-512.png?v=20260117b',
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
        <link rel="apple-touch-icon" href="/manifestbank-icon-512.png?v=20260117b" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <PwaRegister />
        </AuthProvider>
      </body>
    </html>
  )
}
