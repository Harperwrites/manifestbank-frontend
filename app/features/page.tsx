import type { Metadata } from 'next'
import SeoIndexPage, { buildIndexMetadata } from '@/app/components/seo/SeoIndexPage'
import { featurePages } from '@/app/lib/seo-content'

const description =
  'Explore all ManifestBank™ features, including AI Teller, Wealth Builder, Manifestation Checks, The Ether™, the Inner Credit System, and Journaling for Wealth.'

export const metadata: Metadata = buildIndexMetadata({
  title: 'ManifestBank™ Features',
  description,
  path: '/features',
})

export default function FeaturesPage() {
  return (
    <SeoIndexPage
      title="ManifestBank™ Features"
      description={description}
      path="/features"
      eyebrow="Feature Directory"
      intro="Explore the full ManifestBank™ feature set in one place. Each feature is designed to support wealth visualization, behavioral reflection, and guided digital practice in a premium environment."
      complianceNote="ManifestBank™ is not a financial institution and does not hold, move, insure, or manage money. Its features are digital tools for reflection, mindset support, behavioral support, and wealth visualization."
      items={featurePages}
      ctaLabel="Experience the platform"
    />
  )
}
