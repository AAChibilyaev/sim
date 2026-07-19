import { ProsePage } from '@/app/(landing)/components/prose-page'
import { COOKIE_CONFIG } from '@/app/(landing)/cookie/cookie-content'

/** Cookie policy — thin consumer of the shared ProsePage primitive. */
export default function Cookie() {
  return <ProsePage config={COOKIE_CONFIG} />
}
