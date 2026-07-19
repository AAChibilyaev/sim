import { getSiteUrl } from '@/lib/core/utils/urls'
import { JsonLd } from '@/app/(landing)/components/json-ld'
import { getBrandConfig } from '@/ee/whitelabeling/branding'

/**
 * Site-wide JSON-LD - the `Organization` and `WebSite` entities that are true on
 * every landing-family page. Rendered once by the shared landing layout (via
 * {@link LandingShell}), server-side before any visible content, so crawlers and
 * AI answer engines read the canonical site graph first.
 *
 * Page-specific schema (WebPage, BreadcrumbList, Article, Product, FAQ, …) lives
 * on each page and references these entities by `@id`. The canonical `@id` form
 * is `${siteUrl}#organization` / `${siteUrl}#website` (no slash before the
 * fragment) - every per-page emitter points `isPartOf`/`publisher`/`about` at
 * these exact ids, so the graph resolves.
 *
 * Brand-driven: when a whitelabel brand is configured, the org name, socials,
 * and postal identity are replaced/omitted so a self-hosted deployment does not
 * advertise the upstream Sim organization. `sameAs` must match the Footer social
 * links; `legalName` matches the entity named throughout `(landing)/terms`.
 */
export function SiteStructuredData() {
  const brand = getBrandConfig()
  const siteUrl = getSiteUrl()
  const name = brand.name
  const isDefaultBrand = !brand.isWhitelabeled

  const organization: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': `${siteUrl}#organization`,
    name,
    ...(isDefaultBrand ? { alternateName: 'Sim Studio', legalName: 'Sim, Inc' } : {}),
    description: `${name} is the open-source AI workspace where teams build, deploy, and manage AI agents. Connect 1,000+ integrations and every major LLM to create agents that automate real work.`,
    url: siteUrl,
    foundingDate: '2025',
    ...(isDefaultBrand
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: '80 Langton St',
            addressLocality: 'San Francisco',
            addressRegion: 'CA',
            postalCode: '94103',
            addressCountry: 'US',
          },
        }
      : {}),
    logo: {
      '@type': 'ImageObject',
      '@id': `${siteUrl}#logo`,
      url: brand.logoUrl ?? `${siteUrl}/logo/b%26w/text/b%26w.svg`,
      contentUrl: brand.logoUrl ?? `${siteUrl}/logo/b%26w/text/b%26w.svg`,
      caption: `${name} Logo`,
    },
    image: { '@id': `${siteUrl}#logo` },
    brand: { '@type': 'Brand', name },
    ...(isDefaultBrand
      ? {
          sameAs: [
            'https://x.com/simdotai',
            'https://github.com/simstudioai/sim',
            'https://www.linkedin.com/company/simstudioai/',
            'https://join.slack.com/t/sim-ott9864/shared_invite/zt-43lp8tc5v-0qrrqHGBKUsvQlpoouH~TA',
          ],
        }
      : {}),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: `${siteUrl}/contact`,
        availableLanguage: ['en'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        url: `${siteUrl}/contact`,
        availableLanguage: ['en'],
      },
    ],
  }

  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: `${name}, The AI Workspace | Build, Deploy & Manage AI Agents`,
        description: `${name} is the open-source AI workspace where teams build, deploy, and manage AI agents. Connect 1,000+ integrations and every major LLM. Join 100,000+ builders.`,
        publisher: { '@id': `${siteUrl}#organization` },
        inLanguage: 'en-US',
      },
    ],
  }

  return <JsonLd data={siteJsonLd} />
}
