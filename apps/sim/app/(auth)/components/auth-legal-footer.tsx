import { companyReqLineRu } from '@/lib/legal/company'
import { AuthTextLink } from '@/app/(auth)/components/auth-text-link'
import { getBrandConfig } from '@/ee/whitelabeling/branding'

interface AuthLegalFooterProps {
  /** The gerund describing the consent action, e.g. "signing in". */
  action: string
}

/**
 * Consent fine print shared by login and signup, plus the legal links and
 * merchant реквизиты required by the Russian acquiring checklists (Точка /
 * Robokassa): the offer, privacy, cookie, and contacts pages must be reachable
 * and the ИНН/ОГРН visible from the site's entry point (root redirects here).
 */
export function AuthLegalFooter({ action }: AuthLegalFooterProps) {
  const brand = getBrandConfig()

  return (
    <div className='flex flex-col items-center gap-2 text-center'>
      <p className='text-[var(--text-muted)] text-caption leading-relaxed'>
        By {action}, you agree to our{' '}
        <AuthTextLink href={brand.termsUrl ?? '/terms'} external>
          Terms of Service
        </AuthTextLink>{' '}
        and{' '}
        <AuthTextLink href={brand.privacyUrl ?? '/privacy'} external>
          Privacy Policy
        </AuthTextLink>
      </p>
      <p className='flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[var(--text-muted)] text-caption'>
        <AuthTextLink href='/oferta' external>
          Оферта
        </AuthTextLink>
        <span aria-hidden>·</span>
        <AuthTextLink href={brand.privacyUrl ?? '/privacy'} external>
          Конфиденциальность
        </AuthTextLink>
        <span aria-hidden>·</span>
        <AuthTextLink href='/cookie' external>
          Cookie
        </AuthTextLink>
        <span aria-hidden>·</span>
        <AuthTextLink href='/contacts' external>
          Контакты
        </AuthTextLink>
      </p>
      <p className='text-[var(--text-muted)] text-micro leading-relaxed'>{companyReqLineRu()}</p>
    </div>
  )
}
