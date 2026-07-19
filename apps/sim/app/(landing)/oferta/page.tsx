import { buildLandingMetadata } from '@/lib/landing/seo'
import Oferta from '@/app/(landing)/oferta/oferta'

export const revalidate = 3600

const TITLE = 'Публичная оферта | AACFlow'
const DESCRIPTION =
  'Договор оказания услуг сервиса AACFlow: предмет, тарифы, порядок оплаты через Банк Точка и Робокассу, оказание услуги, возврат и реквизиты.'

export const metadata = buildLandingMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/oferta',
})

export default function Page() {
  return <Oferta />
}
