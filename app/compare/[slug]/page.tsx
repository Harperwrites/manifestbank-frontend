import { notFound } from 'next/navigation'
import SeoPage, { buildMetadata } from '@/app/components/seo/SeoPage'
import { comparePageMap, comparePages } from '@/app/lib/seo-content'

export const dynamicParams = false

type RouteProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return comparePages.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params
  const entry = comparePageMap.get(slug)
  if (!entry) {
    return {}
  }

  return buildMetadata(entry)
}

export default async function CompareSeoPage({ params }: RouteProps) {
  const { slug } = await params
  const entry = comparePageMap.get(slug)
  if (!entry) {
    notFound()
  }

  return <SeoPage entry={entry} />
}
