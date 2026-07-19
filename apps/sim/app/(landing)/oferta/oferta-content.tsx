import { COMPANY } from '@/lib/legal/company'
import type { LegalPageConfig } from '@/app/(landing)/components/prose-page'

/**
 * Публичная оферта на оказание услуг AACFlow (RU) + Public Offer (EN),
 * expressed as a typed {@link LegalPageConfig} rendered by ProsePage. Covers the
 * subject of the contract, tariffs, payment via Точка/Robokassa, delivery of the
 * SaaS service, refund/withdrawal, and the merchant реквизиты — the set required
 * by the Точка (Т‑Банк) and Robokassa acquiring checklists.
 *
 * ⚠️ Contains TEST реквизиты (see {@link COMPANY}) while `COMPANY.isTestData`.
 */
const c = COMPANY

export const OFERTA_CONFIG: LegalPageConfig = {
  title: 'Публичная оферта',
  description: `Договор оказания услуг сервиса AACFlow (${c.legalNameEn}). Настоящий документ является официальным публичным предложением заключить договор на изложенных ниже условиях.`,
  lastUpdated: '19 июля 2026',
  intro: [
    ...(c.isTestData
      ? [
          {
            kind: 'callout' as const,
            content:
              '⚠️ Черновик с тестовыми реквизитами. Реквизиты ООО (ИНН, ОГРН, адрес, банк) — заполнители и подлежат замене на действительные перед подключением приёма платежей.',
          },
        ]
      : []),
    {
      kind: 'paragraph',
      content: `${c.legalNameRu} (далее — «Исполнитель»), в лице директора ${c.directorRu}, действующего на основании Устава, публикует настоящую Оферту — предложение заключить договор возмездного оказания услуг с любым лицом (далее — «Заказчик»), принявшим её условия.`,
    },
    {
      kind: 'paragraph',
      content:
        'Акцептом Оферты (полным и безоговорочным принятием условий) считается регистрация Заказчика в сервисе AACFlow и/или оплата услуг. С момента акцепта договор считается заключённым.',
    },
  ],
  sections: [
    {
      id: 'subject',
      heading: '1. Предмет договора',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Исполнитель предоставляет Заказчику доступ к облачному сервису AACFlow — рабочему пространству для создания, запуска и управления ИИ‑агентами и рабочими процессами (SaaS) — на условиях подписки, а Заказчик оплачивает услуги.',
        },
        {
          kind: 'paragraph',
          content:
            'Услуга оказывается дистанционно через сеть Интернет по адресу https://aacflow.io. Функциональный объём определяется выбранным тарифным планом.',
        },
      ],
    },
    {
      id: 'tariffs',
      heading: '2. Тарифы и стоимость',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Стоимость услуг определяется тарифными планами, опубликованными в личном кабинете сервиса (раздел «Upgrade / Тарифы»). Действуют планы Free, Pro и Max, а также оплата по мере использования (кредиты). Стоимость указывается в валюте, указанной при оформлении.',
        },
        {
          kind: 'list',
          items: [
            'Pro — расширенные лимиты и функции для команд;',
            'Max — максимальные лимиты, приоритетная обработка;',
            'Кредиты (pay-as-you-go) — списываются по фактическому потреблению ресурсов ИИ.',
          ],
        },
        {
          kind: 'paragraph',
          content:
            'Исполнитель вправе изменять тарифы, уведомив Заказчика через сервис. Изменения не распространяются на уже оплаченный период.',
        },
      ],
    },
    {
      id: 'payment',
      heading: '3. Порядок оплаты',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Оплата производится в безналичном порядке банковскими картами (Мир, Visa, Mastercard) через платёжные сервисы АО «ТБанк» (Банк Точка) и/или ООО «Робокасса». Приём платежей осуществляется в защищённой среде провайдера; Исполнитель не хранит данные банковских карт Заказчика.',
        },
        {
          kind: 'paragraph',
          content:
            'Услуга предоставляется по факту поступления оплаты. При подписке оплата списывается за расчётный период (месяц/год) авансом. Моментом оплаты считается зачисление средств на счёт Исполнителя.',
        },
      ],
    },
    {
      id: 'delivery',
      heading: '4. Порядок оказания услуги',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Доступ к оплаченному функционалу активируется автоматически сразу после подтверждения оплаты платёжным провайдером — как правило, в течение нескольких минут. Услуга является электронной и не требует физической доставки.',
        },
        {
          kind: 'paragraph',
          content:
            'Услуга считается оказанной надлежащим образом и принятой Заказчиком, если в течение расчётного периода не поступило мотивированной претензии.',
        },
      ],
    },
    {
      id: 'refund',
      heading: '5. Возврат и отказ от услуги',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Заказчик вправе отказаться от подписки в любой момент через личный кабинет; списания за следующий период прекращаются. Возврат средств за неиспользованную часть оплаченного периода производится по заявлению на адрес ' +
            `${c.legalEmail} в течение 10 рабочих дней на тот же способ оплаты, за вычетом фактически понесённых Исполнителем расходов и стоимости фактически потреблённых ресурсов (кредитов).`,
        },
        {
          kind: 'paragraph',
          content:
            'Возврат за уже потреблённые ресурсы (израсходованные кредиты, выполненные запуски) не производится, так как услуга в этой части фактически оказана.',
        },
      ],
    },
    {
      id: 'responsibility',
      heading: '6. Ответственность сторон',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Исполнитель прилагает разумные усилия для бесперебойной работы сервиса, но не гарантирует отсутствие технических перерывов. Исполнитель не несёт ответственности за результаты, полученные Заказчиком с помощью ИИ‑агентов, и за действия сторонних интеграций и моделей.',
        },
        {
          kind: 'paragraph',
          content:
            'Заказчик обязуется использовать сервис в соответствии с законодательством РФ и не размещать противоправный контент.',
        },
      ],
    },
    {
      id: 'requisites',
      heading: '7. Реквизиты Исполнителя',
      blocks: [
        {
          kind: 'list',
          items: [
            `Наименование: ${c.legalNameRu}`,
            `ИНН: ${c.inn}`,
            `ОГРН: ${c.ogrn}`,
            `КПП: ${c.kpp}`,
            `Юридический адрес: ${c.legalAddressRu}`,
            `Телефон: ${c.supportPhone}`,
            `E-mail: ${c.supportEmail}`,
            ...(c.bank
              ? [
                  `Банк: ${c.bank.name}`,
                  `Р/с: ${c.bank.account}`,
                  `БИК: ${c.bank.bic}`,
                  `К/с: ${c.bank.corrAccount}`,
                ]
              : []),
          ],
        },
      ],
    },
    {
      id: 'en',
      heading: 'English summary (Public Offer)',
      blocks: [
        {
          kind: 'paragraph',
          content: `This is a public offer by ${c.legalNameEn} to provide access to the AACFlow cloud AI workspace (SaaS) on a subscription basis. Acceptance occurs on registration and/or payment.`,
        },
        {
          kind: 'paragraph',
          content:
            'Payment is made by bank card (Mir, Visa, Mastercard) via Tochka Bank (T‑Bank) and/or Robokassa in the provider’s secure environment; card data is not stored by the merchant. Access to paid features is activated automatically within minutes of confirmed payment (electronic service, no physical delivery).',
        },
        {
          kind: 'paragraph',
          content: `You may cancel a subscription at any time in the account; a refund for the unused part of a paid period is issued on request to ${c.legalEmail} within 10 business days to the original payment method, minus actually consumed resources (credits). Consumed resources are non-refundable.`,
        },
      ],
    },
  ],
}
