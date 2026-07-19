import { buildLandingMetadata } from '@/lib/landing/seo'
import Cookie from '@/app/(landing)/cookie/cookie'

export const revalidate = 3600

const TITLE = 'Политика cookie | AACFlow'
const DESCRIPTION = 'Как сервис AACFlow использует файлы cookie на сайте aacflow.io.'

export const metadata = buildLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/cookie',
})

export default function Page() {
  return <Cookie />
}
