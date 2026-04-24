import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import Script from 'next/script'
import Navbar from '@/app/components/Navbar'
import { Button, Card, Container, Pill } from '@/app/components/ui'
import HeroCornerLogo from '@/app/components/HeroCornerLogo'
import { SITE_URL, type SeoPageEntry } from '@/app/lib/seo-content'

type SeoIndexPageProps = {
  title: string
  description: string
  path: string
  eyebrow: string
  intro: string
  complianceNote: string
  items: SeoPageEntry[]
  ctaLabel?: string
}

export function buildIndexMetadata({
  title,
  description,
  path,
}: Pick<SeoIndexPageProps, 'title' | 'description' | 'path'>): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | ManifestBank™`,
      description,
      url: `${SITE_URL}${path}`,
      siteName: 'ManifestBank™',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ManifestBank™`,
      description,
    },
  }
}

export default function SeoIndexPage({
  title,
  description,
  path,
  eyebrow,
  intro,
  complianceNote,
  items,
  ctaLabel = 'Explore ManifestBank™',
}: SeoIndexPageProps) {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: title,
        item: `${SITE_URL}${path}`,
      },
    ],
  }

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ManifestBank™',
      url: SITE_URL,
    },
  }

  return (
    <>
      <Script
        id={`schema-collection-${path.replace(/\W+/g, '-')}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <Script
        id={`schema-breadcrumb-${path.replace(/\W+/g, '-')}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main>
        <Navbar />
        <Container>
          <nav aria-label="Breadcrumb" style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: 'var(--ink-soft)', fontSize: 14 }}>
              <Link href="/" style={{ textDecoration: 'underline' }}>
                Home
              </Link>
              <span> / </span>
              <span>{title}</span>
            </div>
          </nav>

          <section
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '42px 26px',
              borderRadius: 30,
              border: '1px solid rgba(95, 74, 62, 0.18)',
              background:
                'linear-gradient(145deg, rgba(30, 22, 18, 0.92), rgba(44, 31, 24, 0.82) 42%, rgba(74, 49, 35, 0.62))',
              boxShadow: '0 28px 64px rgba(20, 15, 12, 0.24)',
              minHeight: 560,
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            <HeroCornerLogo />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <Image
                src="/manifestbank-hero-landing-idea.png"
                alt=""
                fill
                sizes="100vw"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  opacity: 0.43,
                  filter: 'saturate(0.88) contrast(1.02) brightness(0.86)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, rgba(19, 13, 10, 0.96) 0%, rgba(19, 13, 10, 0.8) 34%, rgba(19, 13, 10, 0.4) 66%, rgba(19, 13, 10, 0.66) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(circle at top left, rgba(246, 229, 205, 0.22), transparent 30%), radial-gradient(circle at 18% 78%, rgba(213, 164, 121, 0.18), transparent 24%), linear-gradient(180deg, rgba(249, 244, 238, 0.08), rgba(15, 9, 7, 0.22) 76%, rgba(12, 8, 6, 0.46))',
                  mixBlendMode: 'screen',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'url("/marble-veins.png")',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.14,
                  mixBlendMode: 'screen',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 'auto -80px -110px auto',
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'rgba(182, 121, 103, 0.12)',
                filter: 'blur(10px)',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
              <Pill>{eyebrow}</Pill>
              <h1
                style={{
                  margin: '18px 0 0',
                  fontFamily: 'var(--font-serif)',
                  fontSize: 54,
                  lineHeight: 1.02,
                  fontWeight: 600,
                  color: 'var(--marble-ivory)',
                  textShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  margin: '18px 0 0',
                  maxWidth: 780,
                  fontSize: 20,
                  color: 'rgba(251, 248, 243, 0.88)',
                  textShadow: '0 10px 24px rgba(0, 0, 0, 0.28)',
                }}
              >
                {intro}
              </p>
              <div
                style={{
                  marginTop: 20,
                  padding: '16px 18px',
                  maxWidth: 860,
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: 'rgba(251, 248, 243, 0.88)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 6 }}>Important clarification</strong>
                <span>{complianceNote}</span>
              </div>
              <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/auth" style={{ textDecoration: 'none' }}>
                  <Button>{ctaLabel}</Button>
                </Link>
                <Link href="/manifestbank-app" style={{ textDecoration: 'none' }}>
                  <Button variant="outlineLight">See how ManifestBank™ works</Button>
                </Link>
              </div>
            </div>
          </section>

          <section style={{ marginTop: 30 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 16,
              }}
            >
              {items.map((item) => (
                <Card key={item.path} tone="soft">
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600 }}>
                    <Link href={item.path} style={{ textDecoration: 'none' }}>
                      {item.title}
                    </Link>
                  </div>
                  <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)' }}>{item.description}</p>
                  <div style={{ marginTop: 12, fontSize: 14, color: 'var(--muted)' }}>{item.keyword}</div>
                  <div style={{ marginTop: 16 }}>
                    <Link href={item.path} style={{ color: 'var(--rose-gold)', textDecoration: 'underline' }}>
                      Open page
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </Container>
      </main>
    </>
  )
}
