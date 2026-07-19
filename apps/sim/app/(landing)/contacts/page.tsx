import { buildLandingMetadata } from '@/lib/landing/seo'
import Contacts from '@/app/(landing)/contacts/contacts'

export const revalidate = 3600

const TITLE = 'Контакты и реквизиты | AACFlow'
const DESCRIPTION = 'Юридическая информация о продавце (ИНН, ОГРН, адрес) и способы связи.'

export const metadata = buildLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/contacts',
})

export default function Page() {
  return <Contacts />
}
