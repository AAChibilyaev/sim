import { buildLandingMetadata } from '@/lib/landing/seo'
import Privacy from '@/app/(landing)/privacy/privacy'

export const revalidate = 3600

const TITLE = 'Политика конфиденциальности | AACFlow'
const DESCRIPTION = 'Политика обработки персональных данных сервиса AACFlow по 152-ФЗ.'

export const metadata = buildLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/privacy',
})

export default function Page() {
  return <Privacy />
}
