import { notFound } from 'next/navigation'
import SeoPage, { buildMetadata } from '@/app/components/seo/SeoPage'
import { featurePageMap, featurePages } from '@/app/lib/seo-content'

export const dynamicParams = false

type RouteProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return featurePages.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params
  const entry = featurePageMap.get(slug)
  if (!entry) {
    return {}
  }

  return buildMetadata(entry)
}

export default async function FeatureSeoPage({ params }: RouteProps) {
  const { slug } = await params
  const entry = featurePageMap.get(slug)
  if (!entry) {
    notFound()
  }

  return <SeoPage entry={entry} />
}
