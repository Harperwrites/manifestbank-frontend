import type { Metadata } from 'next'
import SeoIndexPage, { buildIndexMetadata } from '@/app/components/seo/SeoIndexPage'
import { blogPages } from '@/app/lib/seo-content'

const description =
  'Read the ManifestBank™ blog for articles on wealth visualization, behavioral fintech, manifestation, money habits, and reflective growth.'

export const metadata: Metadata = buildIndexMetadata({
  title: 'ManifestBank™ Blog',
  description,
  path: '/blog',
})

export default function BlogPage() {
  return (
    <SeoIndexPage
      title="ManifestBank™ Blog"
      description={description}
      path="/blog"
      eyebrow="Editorial Archive"
      intro="Explore ManifestBank™ articles on behavioral finance, manifestation, identity, money habits, and the category language surrounding intentional financial growth."
      complianceNote="ManifestBank™ content is educational and reflective in nature. It is not financial, legal, medical, or investment advice, and the platform does not hold or move money."
      items={blogPages}
      ctaLabel="Read the platform"
    />
  )
}
