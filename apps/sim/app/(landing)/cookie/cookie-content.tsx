import type { LegalPageConfig } from '@/app/(landing)/components/prose-page'

/**
 * Политика в отношении файлов cookie (RU + EN). Required by the Точка (Т‑Банк)
 * acquiring checklist.
 */
export const COOKIE_CONFIG: LegalPageConfig = {
  title: 'Политика использования файлов cookie',
  description:
    'Как сервис AACFlow использует файлы cookie и аналогичные технологии на сайте aacflow.io.',
  lastUpdated: '19 июля 2026',
  intro: [
    {
      kind: 'paragraph',
      content:
        'Сайт aacflow.io использует файлы cookie — небольшие текстовые файлы, сохраняемые в браузере, — чтобы обеспечивать работу сервиса, запоминать ваши настройки и улучшать качество работы.',
    },
  ],
  sections: [
    {
      id: 'types',
      heading: 'Какие cookie мы используем',
      blocks: [
        {
          kind: 'list',
          items: [
            'Технические (обязательные) — авторизация, сохранение сессии, безопасность. Без них сервис не работает;',
            'Функциональные — язык интерфейса (RU/EN/DE), выбранные настройки;',
            'Аналитические — обезличенная статистика использования для улучшения сервиса.',
          ],
        },
      ],
    },
    {
      id: 'manage',
      heading: 'Управление cookie',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'Вы можете отключить cookie в настройках браузера. Обратите внимание: без технических cookie авторизация и часть функций сервиса будут недоступны.',
        },
        {
          kind: 'paragraph',
          content:
            'Продолжая пользоваться сайтом, вы соглашаетесь с использованием cookie в соответствии с настоящей Политикой и Политикой конфиденциальности.',
        },
      ],
    },
    {
      id: 'en',
      heading: 'Cookie policy (EN)',
      blocks: [
        {
          kind: 'paragraph',
          content:
            'aacflow.io uses strictly-necessary cookies (auth, session, security), functional cookies (language, preferences) and anonymous analytics cookies. You can disable cookies in your browser, but authentication and some features require the necessary cookies. Continued use constitutes consent.',
        },
      ],
    },
  ],
}
