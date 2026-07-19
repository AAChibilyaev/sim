import { buildLandingMetadata } from '@/lib/landing/seo'
import EnterprisePage, { ENTERPRISE_SEO_DESCRIPTION } from '@/app/(landing)/enterprise/enterprise'
import { getBrandConfig } from '@/ee/whitelabeling/branding'

export const revalidate = 3600

const TITLE = `Enterprise AI Agent Platform | ${getBrandConfig().name}`

export const metadata = buildLandingMetadata({
  title: TITLE,
  description: ENTERPRISE_SEO_DESCRIPTION,
  path: '/enterprise',
  keywords:
    'enterprise ai agents, enterprise ai agent, enterprise ai agent platform, enterprise workflow agents',
  twitterImageAlt: 'Sim',
})

export default function Page() {
  return <EnterprisePage />
}
