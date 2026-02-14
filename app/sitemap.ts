import type { MetadataRoute } from 'next'

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
  ]
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
  }))
}
