import { ProsePage } from '@/app/(landing)/components/prose-page'
import { CONTACTS_CONFIG } from '@/app/(landing)/contacts/contacts-content'

/** Контакты и реквизиты — thin consumer of the shared ProsePage primitive. */
export default function Contacts() {
  return <ProsePage config={CONTACTS_CONFIG} />
}
