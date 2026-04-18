import type { Metadata } from 'next'
import SeoIndexPage, { buildIndexMetadata } from '@/app/components/seo/SeoIndexPage'
import { comparePages } from '@/app/lib/seo-content'

const description =
  'Read all ManifestBank™ comparison pages, including how the platform differs from manifestation apps, affirmation apps, budgeting tools, and goal trackers.'

export const metadata: Metadata = buildIndexMetadata({
  title: 'ManifestBank™ Comparisons',
  description,
  path: '/compare',
})

export default function ComparePage() {
  return (
    <SeoIndexPage
      title="ManifestBank™ Comparisons"
      description={description}
      path="/compare"
      eyebrow="Comparison Directory"
      intro="Review the full comparison library to see where ManifestBank™ differs from adjacent app categories and why the platform is positioned as a wealth visualization experience rather than a traditional finance tool."
      complianceNote="ManifestBank™ is not a financial institution and does not provide bank accounts, loans, investment advice, or money movement. These comparison pages are for positioning and education."
      items={comparePages}
      ctaLabel="Explore ManifestBank™"
    />
  )
}
