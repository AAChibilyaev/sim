import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/core/utils/urls'
import { HOME_PAGE_DESCRIPTION } from '@/app/(landing)/components/home-structured-data'
import Landing from '@/app/(landing)/landing'
import { getBrandConfig } from '@/ee/whitelabeling'

export const revalidate = 3600

const brand = getBrandConfig()
const HOME_TITLE = `${brand.name}, The AI Workspace | Build, Deploy & Manage AI Agents`
const HOME_IMAGE_ALT = `${brand.name}, The AI Workspace for Teams`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    absolute: HOME_TITLE,
  },
  description: HOME_PAGE_DESCRIPTION,
  keywords:
    'AI workspace, AI agent builder, AI agent workflow builder, build AI agents, visual workflow builder, open-source AI agent platform, AI agents, agentic workflows, LLM orchestration, AI automation, knowledge base, workflow builder, AI integrations, SOC2 compliant, enterprise AI',
  authors: [{ name: brand.name }],
  creator: brand.name,
  publisher: brand.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_PAGE_DESCRIPTION,
    type: 'website',
    url: SITE_URL,
    siteName: brand.name,
    locale: 'en_US',
    images: [
      {
        url: '/logo/426-240/reverse/small.png',
        width: 2130,
        height: 1200,
        alt: HOME_IMAGE_ALT,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    ...(brand.isWhitelabeled ? {} : { site: '@simdotai', creator: '@simdotai' }),
    title: HOME_TITLE,
    description: HOME_PAGE_DESCRIPTION,
    images: {
      url: '/logo/426-240/reverse/small.png',
      alt: HOME_IMAGE_ALT,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-US': SITE_URL,
      'x-default': SITE_URL,
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
  classification: 'AI Development Tools',
  referrer: 'origin-when-cross-origin',
}

export default function Page() {
  return <Landing />
}
