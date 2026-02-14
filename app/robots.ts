import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/auth',
          '/auth/*',
          '/dashboard',
          '/ether',
          '/myline',
          '/myline/*',
          '/mychecks',
          '/myaffirmations',
          '/myaffirmations/*',
          '/myjournal',
          '/myjournal/*',
          '/mystatements',
          '/mystatements/*',
          '/notifications',
          '/sync',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: 'https://manifestbank.app/sitemap.xml',
  }
}
