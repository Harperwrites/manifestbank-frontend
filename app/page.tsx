import type { Metadata } from 'next'
import Navbar from '@/app/components/Navbar'
import { Button, Card, Container, Pill } from '@/app/components/ui'
import { getLinksByHref } from '@/app/lib/seo-content'
import { RelatedLinks } from '@/app/components/seo/SeoPage'
import Link from 'next/link'
import Image from 'next/image'
import HeroCornerLogo from '@/app/components/HeroCornerLogo'
import DefaultDashboardRedirect from '@/app/components/DefaultDashboardRedirect'

export const metadata: Metadata = {
  title: 'ManifestBank™',
  description:
    'ManifestBank™ is a premium wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
  alternates: {
    canonical: '/',
  },
}

export default function Home() {
  const homepageLinks = getLinksByHref([
    '/manifestbank-app',
    '/behavioral-fintech',
    '/wealth-visualization-platform',
    '/manifestation-app',
  ])

  return (
    <main>
      <DefaultDashboardRedirect />
      <Navbar />
      <Container>
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '44px 28px',
            borderRadius: 30,
            border: '1px solid rgba(95, 74, 62, 0.18)',
            background:
              'linear-gradient(145deg, rgba(30, 22, 18, 0.92), rgba(44, 31, 24, 0.82) 42%, rgba(74, 49, 35, 0.62))',
            boxShadow: '0 28px 64px rgba(20, 15, 12, 0.24)',
            minHeight: 620,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <HeroCornerLogo />
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
              priority
              sizes="100vw"
              style={{
                objectFit: 'cover',
                objectPosition: 'center center',
                opacity: 0.48,
                filter: 'saturate(0.9) contrast(1.04) brightness(0.9)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(19, 13, 10, 0.96) 0%, rgba(19, 13, 10, 0.78) 36%, rgba(19, 13, 10, 0.34) 66%, rgba(19, 13, 10, 0.62) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at top left, rgba(246, 229, 205, 0.26), transparent 28%), radial-gradient(circle at 18% 78%, rgba(213, 164, 121, 0.22), transparent 22%), linear-gradient(180deg, rgba(249, 244, 238, 0.08), rgba(15, 9, 7, 0.22) 76%, rgba(12, 8, 6, 0.46))',
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
                opacity: 0.16,
                mixBlendMode: 'screen',
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 'auto -120px -120px auto',
              width: 340,
              height: 340,
              borderRadius: '50%',
              background: 'rgba(182, 121, 103, 0.12)',
              filter: 'blur(10px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              maxWidth: 720,
            }}
          >
          <Pill>ManifestBank™</Pill>
          <h1
            style={{
              margin: '18px 0 0',
              fontFamily: 'var(--font-serif)',
              fontSize: 58,
              lineHeight: 0.98,
              fontWeight: 600,
              maxWidth: 760,
              color: 'var(--marble-ivory)',
              textShadow: '0 12px 28px rgba(0, 0, 0, 0.32)',
            }}
          >
            A wealth visualization platform for intentional financial growth.
          </h1>
          <p
            style={{
              margin: '18px 0 0',
              maxWidth: 760,
              fontSize: 20,
              color: 'rgba(251, 248, 243, 0.88)',
              textShadow: '0 10px 24px rgba(0, 0, 0, 0.28)',
            }}
          >
            ManifestBank™ blends behavioral finance concepts, digital reflection, mindset support,
            and guided tools for intentional financial growth. It is not a financial institution and
            does not hold, move, or manage money.
          </p>
          <div style={{ marginTop: 18, maxWidth: 640, color: 'rgba(251, 248, 243, 0.68)', fontSize: 14 }}>
            Designed as a private-feeling digital environment for clarity, identity alignment, and
            disciplined wealth reflection.
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/auth" style={{ textDecoration: 'none' }}>
              <Button>Explore ManifestBank™</Button>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <Card>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 28 }}>Premium clarity</h2>
              <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)' }}>
                A composed digital environment for reflection, money awareness, and identity
                alignment.
              </p>
            </Card>
            <Card>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 28 }}>Guided tools</h2>
              <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)' }}>
                Explore AI-driven support, journaling, manifestation checks, and symbolic wealth
                routines.
              </p>
            </Card>
            <Card>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 28 }}>Clear boundaries</h2>
              <p style={{ margin: '10px 0 0', color: 'var(--ink-soft)' }}>
                ManifestBank™ is not a bank, lender, credit union, or investment adviser. The
                platform supports reflection and awareness only.
              </p>
            </Card>
          </div>
        </section>

        <RelatedLinks title="Explore ManifestBank™" links={homepageLinks} />
      </Container>
    </main>
  )
}
