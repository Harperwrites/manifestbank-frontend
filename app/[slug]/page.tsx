import { notFound } from 'next/navigation'
import SeoPage, { buildMetadata } from '@/app/components/seo/SeoPage'
import { corePages, rootPageMap } from '@/app/lib/seo-content'

export const dynamicParams = false

type RouteProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return corePages.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params
  const entry = rootPageMap.get(slug)
  if (!entry) {
    return {}
  }

  return buildMetadata(entry)
}

export default async function RootSeoPage({ params }: RouteProps) {
  const { slug } = await params
  const entry = rootPageMap.get(slug)
  if (!entry) {
    notFound()
  }

  return <SeoPage entry={entry} />
}
