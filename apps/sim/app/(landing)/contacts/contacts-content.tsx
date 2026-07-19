import { COMPANY } from '@/lib/legal/company'
import type { LegalPageConfig } from '@/app/(landing)/components/prose-page'

/**
 * Контакты и реквизиты (RU + EN). Surfaces the merchant legal identity and
 * contact channels required by the Точка (Т‑Банк) and Robokassa acquiring
 * checklists (наименование, ИНН, ОГРН, КПП, адрес, телефон, e-mail).
 *
 * ⚠️ Contains TEST реквизиты (see {@link COMPANY}) while `COMPANY.isTestData`.
 */
const c = COMPANY

export const CONTACTS_CONFIG: LegalPageConfig = {
  title: 'Контакты и реквизиты',
  description: 'Юридическая информация о продавце и способы связи.',
  lastUpdated: '19 июля 2026',
  intro: c.isTestData
    ? [
        {
          kind: 'callout',
          content:
            '⚠️ Тестовые реквизиты. Значения ИНН, ОГРН, КПП, адреса и телефона — заполнители; заменяются на действительные данные ООО перед подключением приёма платежей.',
        },
      ]
    : [],
  sections: [
    {
      id: 'requisites',
      heading: 'Реквизиты продавца',
      blocks: [
        {
          kind: 'list',
          items: [
            `Полное наименование: ${c.legalNameRu}`,
            `Сокращённое наименование: ${c.shortNameRu}`,
            `ИНН: ${c.inn}`,
            `ОГРН: ${c.ogrn}`,
            `КПП: ${c.kpp}`,
            `Юридический адрес: ${c.legalAddressRu}`,
            `Директор: ${c.directorRu}`,
          ],
        },
      ],
    },
    {
      id: 'contacts',
      heading: 'Связаться с нами',
      blocks: [
        {
          kind: 'list',
          items: [
            `Телефон: ${c.supportPhone}`,
            `Поддержка: ${c.supportEmail}`,
            `Юридические вопросы: ${c.legalEmail}`,
            'Сайт: https://aacflow.io',
          ],
        },
        {
          kind: 'paragraph',
          content:
            'Режим обработки обращений: ежедневно. Ответ по электронной почте — в течение 1–2 рабочих дней.',
        },
      ],
    },
    {
      id: 'en',
      heading: 'Contacts & legal details (EN)',
      blocks: [
        {
          kind: 'list',
          items: [
            `Legal entity: ${c.legalNameEn}`,
            `Tax ID (ИНН): ${c.inn}`,
            `Registration (ОГРН): ${c.ogrn}`,
            `Address: ${c.legalAddressEn}`,
            `Phone: ${c.supportPhone}`,
            `Support: ${c.supportEmail}`,
          ],
        },
      ],
    },
  ],
}
