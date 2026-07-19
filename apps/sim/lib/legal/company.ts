/**
 * Merchant legal identity used across the Russian-law legal pages (оферта,
 * политика конфиденциальности, контакты) and the реквизиты footer required by
 * the Точка (Т‑Банк) and Robokassa acquiring checklists.
 *
 * ⚠️ TEST DATA. Every registration number below is a placeholder marked with
 * `isTestData: true` — they are NOT a real legal entity and must be replaced
 * with the merchant's genuine ООО реквизиты (наименование, ИНН, ОГРН, КПП,
 * адрес, банк) before going live with a payment provider. The pages surface an
 * explicit "тестовые данные" notice while this flag is true.
 */
export interface CompanyLegalInfo {
  /** True while the реквизиты below are placeholders, not a real entity. */
  isTestData: boolean
  /** Full legal name, e.g. Общество с ограниченной ответственностью «…». */
  legalNameRu: string
  /** Short legal name, e.g. ООО «…». */
  shortNameRu: string
  /** English legal name for the bilingual pages. */
  legalNameEn: string
  inn: string
  ogrn: string
  kpp: string
  /** Registered legal address (индекс, город, улица). */
  legalAddressRu: string
  legalAddressEn: string
  /** Director full name (RU) — signs the offer «действующий на основании Устава». */
  directorRu: string
  directorEn: string
  supportPhone: string
  supportEmail: string
  legalEmail: string
  /** Banking details for the public offer. Optional until provided. */
  bank?: {
    name: string
    bic: string
    account: string
    corrAccount: string
  }
}

/**
 * TEST реквизиты. Replace with the real ООО data and set `isTestData: false`.
 */
export const COMPANY: CompanyLegalInfo = {
  isTestData: true,
  legalNameRu: 'Общество с ограниченной ответственностью «ААКФлоу»',
  shortNameRu: 'ООО «ААКФлоу»',
  legalNameEn: 'AACFlow LLC',
  inn: '0000000000',
  ogrn: '0000000000000',
  kpp: '000000000',
  legalAddressRu: '000000, г. Москва, ул. Примерная, д. 1, офис 1',
  legalAddressEn: '000000, Moscow, Primernaya st., 1, office 1',
  directorRu: 'Чибиляев Александр',
  directorEn: 'Alexandr Chibilyaev',
  supportPhone: '+7 (000) 000-00-00',
  supportEmail: 'support@aacflow.io',
  legalEmail: 'legal@aacflow.io',
  bank: {
    name: 'АО «ТБанк»',
    bic: '000000000',
    account: '00000000000000000000',
    corrAccount: '00000000000000000000',
  },
}

/** One-line реквизиты string for the footer (RU). */
export function companyReqLineRu(c: CompanyLegalInfo = COMPANY): string {
  return `${c.shortNameRu} · ИНН ${c.inn} · ОГРН ${c.ogrn}`
}
