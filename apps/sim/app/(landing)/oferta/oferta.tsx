import { ProsePage } from '@/app/(landing)/components/prose-page'
import { OFERTA_CONFIG } from '@/app/(landing)/oferta/oferta-content'

/**
 * Публичная оферта — thin consumer of the shared {@link ProsePage} primitive,
 * so it shares layout and rhythm with Terms/Privacy and cannot drift.
 */
export default function Oferta() {
  return <ProsePage config={OFERTA_CONFIG} />
}
