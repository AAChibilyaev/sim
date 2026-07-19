import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/core/utils/urls'

const DISALLOWED_PATHS = [
  '/api/',
  '/workspace/',
  '/playground/',
  '/resume/',
  '/invite/',
  '/unsubscribe/',
  '/w/',
  '/_next/',
  '/private/',
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: { userAgent: '*', allow: '/', disallow: DISALLOWED_PATHS },
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/blog/sitemap-images.xml`,
      `${siteUrl}/library/sitemap-images.xml`,
    ],
  }
}
