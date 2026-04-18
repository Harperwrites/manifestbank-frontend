import type { MetadataRoute } from 'next'
import { getAllSeoPages } from '@/app/lib/seo-content'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://manifestbank.app'
  const now = new Date().toISOString()
  const routes = [
    '/',
    '/about',
    '/faq',
    '/terms',
    '/privacy',
    '/contact',
    '/careers',
    '/careers/open-roles',
    '/features',
    '/compare',
    '/blog',
    ...getAllSeoPages().map((entry) => entry.path),
  ]
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
  }))
}
