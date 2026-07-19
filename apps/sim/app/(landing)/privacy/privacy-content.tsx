import { COMPANY } from '@/lib/legal/company'
import type { LegalPageConfig } from '@/app/(landing)/components/prose-page'

/**
 * Политика конфиденциальности (обработки персональных данных) по 152‑ФЗ, RU +
 * EN summary. Required by the Точка (Т‑Банк) and Robokassa acquiring checklists.
 * Operator реквизиты come from {@link COMPANY}.
 *
 * ⚠️ Contains TEST реквизиты while `COMPANY.isTestData`.
 */
const c = COMPANY

export const PRIVACY_CONFIG: LegalPageConfig = {
  title: 'Политика конфиденциальности',
  description: `Политика обработки персональных данных сервиса AACFlow (${c.legalNameEn}) в соответствии с Федеральным законом № 152‑ФЗ «О персональных данных».`,
  lastUpdated: '19 июля 2026',
  intro: [
    {
      kind: 'paragraph',
      content: `Настоящая Политика определяет порядок обработки и защиты персональных данных пользователей сайта aacflow.io Оператором — ${c.legalNameRu} (ИНН ${c.inn}, ОГРН ${c.ogrn}).`,
    },
    {
      kind: 'paragraph',
      content:
        'Используя сайт и сервис, пользователь подтверждает согласие с настоящей Политикой. Обработка данных осуществляется на законной основе в соответствии с 152‑ФЗ.',
    },
  ],
  sections: [
    {
      id: 'data',
      heading: '1. Какие данные обрабатываются',
      blocks: [
        {
          kind: 'list',
          items: [
            'имя и адрес электронной почты (при регистрации);',
            'данные учётной записи и настройки;',
            'платёжная информация — обрабатывается платёжными провайдерами (Банк Точка, Робокасса); Оператор не хранит данные банковских карт;',
            'технические данные: IP-адрес, тип браузера, cookie, журналы использования.',
          ],
        },
      ],
    },
    {
      id: 'purpose',
      heading: '2. Цели обработки',
      blocks: [
        {
          kind: 'list',
          items: [
            'регистрация и предоставление доступа к сервису;',
            'оказание услуг и техническая поддержка;',
            'обработка платежей и выставление документов;',
            'информирование об изменениях сервиса;',
            'обеспечение безопасности и соблюдение требований закона.',
          ],
        },
      ],
    },
    {
      id: 'legal',
      heading: '3. Правовые основания',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Обработка осуществляется на основании согласия субъекта персональных данных, а также для исполнения договора (оферты), стороной которого является пользователь, и в силу требований законодательства РФ.',
        },
      ],
    },
    {
      id: 'sharing',
      heading: '4. Передача третьим лицам',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Оператор не продаёт персональные данные. Данные могут передаваться платёжным провайдерам (для проведения оплаты) и поставщикам инфраструктуры/ИИ‑моделей исключительно в объёме, необходимом для оказания услуги, а также по законному требованию уполномоченных органов.',
        },
      ],
    },
    {
      id: 'storage',
      heading: '5. Хранение и защита',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Данные хранятся на защищённых серверах в течение срока, необходимого для целей обработки, и уничтожаются по их достижении или по отзыву согласия. Применяются организационные и технические меры защиты, включая шифрование каналов передачи (HTTPS).',
        },
      ],
    },
    {
      id: 'rights',
      heading: '6. Права субъекта данных',
      blocks: [
        {
          kind: 'paragraph',
          content: `Пользователь вправе запросить доступ к своим данным, их уточнение, блокирование или удаление, а также отозвать согласие на обработку, направив обращение на ${c.legalEmail}. Запрос рассматривается в срок, установленный 152‑ФЗ.`,
        },
      ],
    },
    {
      id: 'operator',
      heading: '7. Оператор',
      blocks: [
        {
          kind: 'list',
          items: [
            `${c.legalNameRu}`,
            `ИНН ${c.inn} · ОГРН ${c.ogrn} · КПП ${c.kpp}`,
            `Адрес: ${c.legalAddressRu}`,
            `E-mail: ${c.legalEmail}`,
          ],
        },
      ],
    },
    {
      id: 'en',
      heading: 'Privacy Policy (EN summary)',
      blocks: [
        {
          kind: 'paragraph',
          content: `${c.legalNameEn} is the data operator for aacflow.io under Russian Federal Law No. 152‑FZ. We process account data (name, email), settings, technical data (IP, cookies, logs); payment card data is handled by the payment providers (Tochka Bank, Robokassa) and is not stored by us.`,
        },
        {
          kind: 'paragraph',
          content: `Data is processed to provide and support the service, handle payments, and meet legal requirements, on the basis of your consent and the contract. You may request access, correction, deletion, or withdraw consent at ${c.legalEmail}. We do not sell personal data; transfers are limited to payment/infrastructure providers as needed and lawful authority requests.`,
        },
      ],
    },
  ],
}
