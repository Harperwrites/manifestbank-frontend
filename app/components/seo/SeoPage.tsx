import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import type { CSSProperties } from 'react'
import Navbar from '@/app/components/Navbar'
import { Button, Card, Container, Pill } from '@/app/components/ui'
import {
  SITE_URL,
  buildMetadata,
  getRelatedLinks,
  type FaqItem,
  type RelatedLink,
  type SeoPageEntry,
} from '@/app/lib/seo-content'

export { buildMetadata }

function sectionTitleStyle(): CSSProperties {
  return {
    fontFamily: 'var(--font-serif)',
    fontSize: 34,
    fontWeight: 600,
    lineHeight: 1.05,
    margin: 0,
  }
}

function supportingHeroLine(entry: SeoPageEntry): string {
  if (entry.kind === 'feature') {
    return 'Built for clarity, reflection, and a more intentional daily wealth practice.'
  }

  if (entry.kind === 'compare') {
    return 'Built for clarity, reflection, and a more intentional way to evaluate wealth-focused tools.'
  }

  if (entry.kind === 'blog') {
    return 'Built for clarity, reflection, and a more intentional understanding of wealth.'
  }

  return 'Built for clarity, reflection, and a more intentional relationship with wealth.'
}

function TopCenterMark() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: -24,
        marginBottom: 8,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 172,
          height: 172,
          borderRadius: 48,
          overflow: 'hidden',
          opacity: 0.92,
        }}
      >
        <Image
          src="/manifestbank-app-logo-latest.png"
          alt=""
          width={172}
          height={172}
          sizes="172px"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}

export function RelatedLinks({
  title = 'Related reading',
  links,
}: {
  title?: string
  links: RelatedLink[]
}) {
  return (
    <section style={{ marginTop: 34 }}>
      <div style={{ ...sectionTitleStyle(), fontSize: 28 }}>{title}</div>
      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {links.map((link) => (
          <Card key={link.href} tone="soft">
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600 }}>
              <Link href={link.href} style={{ textDecoration: 'none' }}>
                {link.title}
              </Link>
            </div>
            <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)' }}>{link.description}</p>
            <div style={{ marginTop: 14 }}>
              <Link href={link.href} style={{ color: 'var(--rose-gold)', textDecoration: 'underline' }}>
                Read more
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function FaqSection({ faq }: { faq: FaqItem[] }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h2 style={sectionTitleStyle()}>FAQ</h2>
      <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
        {faq.map((item) => (
          <Card key={item.question} tone="soft">
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{item.question}</h3>
            <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)' }}>{item.answer}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Breadcrumbs({ entry }: { entry: SeoPageEntry }) {
  const parts = entry.path.split('/').filter(Boolean)
  const crumbs = [
    { href: '/', label: 'Home' },
    ...parts.map((part, index) => ({
      href: `/${parts.slice(0, index + 1).join('/')}`,
      label:
        index === parts.length - 1
          ? entry.title
          : part.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    })),
  ]

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: 'var(--ink-soft)', fontSize: 14 }}>
        {crumbs.map((crumb, index) => (
          <span key={crumb.href}>
            {index > 0 ? ' / ' : ''}
            {index === crumbs.length - 1 ? (
              <span>{crumb.label}</span>
            ) : (
              <Link href={crumb.href} style={{ textDecoration: 'underline' }}>
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>
    </nav>
  )
}

function SeoSchema({ entry }: { entry: SeoPageEntry }) {
  const parts = entry.path.split('/').filter(Boolean)
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE_URL,
    },
    ...parts.map((part, index) => ({
      '@type': 'ListItem',
      position: index + 2,
      name:
        index === parts.length - 1
          ? entry.title
          : part.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      item: `${SITE_URL}/${parts.slice(0, index + 1).join('/')}`,
    })),
  ]

  const faqSchema = entry.faq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entry.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': entry.kind === 'blog' ? 'Article' : 'WebPage',
    headline: entry.title,
    description: entry.description,
    url: `${SITE_URL}${entry.path}`,
    about: entry.keyword,
    isPartOf: {
      '@type': 'WebSite',
      name: 'ManifestBank™',
      url: SITE_URL,
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <>
      <Script
        id={`schema-page-${entry.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />
      <Script
        id={`schema-breadcrumb-${entry.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema ? (
        <Script
          id={`schema-faq-${entry.slug}`}
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
    </>
  )
}

export default function SeoPage({ entry }: { entry: SeoPageEntry }) {
  const links = getRelatedLinks(entry)

  return (
    <>
      <SeoSchema entry={entry} />
      <main>
        <Navbar />
        <div style={{ height: 72 }} />
        <Container>
          <Breadcrumbs entry={entry} />
          <TopCenterMark />
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
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            >
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
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                maxWidth: 760,
              }}
            >
              <Pill>{entry.heroEyebrow}</Pill>
              <h1
                style={{
                  ...sectionTitleStyle(),
                  marginTop: 18,
                  fontSize: 54,
                  color: 'var(--marble-ivory)',
                  textShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
                }}
              >
                {entry.h1}
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
                {entry.intro}
              </p>
              <div
                style={{
                  marginTop: 18,
                  maxWidth: 640,
                  color: 'rgba(251, 248, 243, 0.68)',
                  fontSize: 14,
                }}
              >
                {supportingHeroLine(entry)}
              </div>
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
                <span>{entry.complianceNote}</span>
              </div>
              <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/auth" style={{ textDecoration: 'none' }}>
                  <Button>{entry.ctaLabel ?? 'Explore ManifestBank™'}</Button>
                </Link>
                <Link href="/manifestbank-app" style={{ textDecoration: 'none' }}>
                  <Button variant="outlineLight">See the app position</Button>
                </Link>
              </div>
            </div>
          </section>

          <section style={{ marginTop: 30, display: 'grid', gap: 18 }}>
            {entry.sections.map((section) => (
              <Card key={section.title}>
                <h2 style={{ ...sectionTitleStyle(), fontSize: 30 }}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} style={{ margin: '12px 0 0', color: 'var(--ink-soft)', fontSize: 18 }}>
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul style={{ margin: '14px 0 0', paddingLeft: 22, color: 'var(--ink-soft)' }}>
                    {section.bullets.map((bullet) => (
                      <li key={bullet} style={{ marginTop: 8 }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            ))}
          </section>

          <section style={{ marginTop: 34 }}>
            <Card tone="deep">
              <h2 style={{ ...sectionTitleStyle(), fontSize: 32, color: 'var(--marble-ivory)' }}>
                {entry.ctaTitle ?? 'Explore ManifestBank™'}
              </h2>
              <p style={{ margin: '12px 0 0', maxWidth: 760, color: 'rgba(251, 248, 243, 0.86)', fontSize: 18 }}>
                {entry.ctaCopy}
              </p>
              <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/auth" style={{ textDecoration: 'none' }}>
                  <Button variant="outlineLight">{entry.ctaLabel ?? 'Explore ManifestBank™'}</Button>
                </Link>
                <Link href="/about" style={{ color: 'var(--marble-ivory)', textDecoration: 'underline' }}>
                  Read the platform positioning
                </Link>
              </div>
            </Card>
          </section>

          {entry.faq ? <FaqSection faq={entry.faq} /> : null}
          <RelatedLinks links={links} />
        </Container>
      </main>
    </>
  )
}
