'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface SimLogoProps {
  className?: string
}

/**
 * AACFlow wordmark for the docs chrome (navbar, footer, layout title). Renders
 * the brand name as text in `var(--text-body)` so it reads as one solid ink
 * matching surrounding text in both themes. Keeps the `SimWordmark` export name
 * so existing consumers stay untouched.
 */
export function SimWordmark({ className }: SimLogoProps) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        '-translate-y-[0.5px] inline-flex h-[18px] items-center font-semibold text-[16px] text-[var(--text-body,currentColor)] leading-none tracking-tight',
        className
      )}
    >
      AACFlow
    </span>
  )
}

/**
 * Icon-only Sim mark, no wordmark text. Same brandbook icon geometry as
 * {@link SimLogoFull}'s icon, at its native square viewBox.
 */
export function SimLogoIcon({ className }: SimLogoProps) {
  const gradientId = `sim-logo-icon-gradient-${useId()}`

  return (
    <svg
      viewBox='0 0 222 222'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('size-7', className)}
      aria-label='Sim'
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits='userSpaceOnUse'
          x1='129.434'
          y1='129.266'
          x2='185.629'
          y2='185.33'
        >
          <stop offset='0' />
          <stop offset='1' stopOpacity='0' />
        </linearGradient>
      </defs>
      <path
        clipRule='evenodd'
        d='m107.822 93.7612c0 3.5869-1.419 7.0308-3.938 9.5668l-.361.364c-2.517 2.544-5.9375 3.966-9.4994 3.966h-80.5781c-7.42094 0-13.4455 6.06-13.4455 13.533v87.141c0 7.474 6.02456 13.534 13.4455 13.534h86.5167c7.4208 0 13.4378-6.06 13.4378-13.534v-81.587c0-3.326 1.31-6.517 3.647-8.871 2.33-2.347 5.499-3.667 8.802-3.667h81.928c7.421 0 13.437-6.059 13.437-13.533v-87.1407c0-7.47374-6.016-13.5333-13.437-13.5333h-86.517c-7.421 0-13.438 6.05956-13.438 13.5333zm26.256-75.2112h60.874c4.337 0 7.844 3.5393 7.844 7.9003v61.3071c0 4.3604-3.507 7.9003-7.844 7.9003h-60.874c-4.33 0-7.845-3.5399-7.845-7.9003v-61.3071c0-4.361 3.515-7.9003 7.845-7.9003z'
        fill='#33C482'
        fillRule='evenodd'
      />
      <path
        d='m207.878 129.57h-64.324c-7.798 0-14.12 6.367-14.12 14.221v63.993c0 7.854 6.322 14.221 14.12 14.221h64.324c7.799 0 14.121-6.367 14.121-14.221v-63.993c0-7.854-6.322-14.221-14.121-14.221z'
        fill='#33C482'
      />
      <path
        d='m207.878 129.266h-64.324c-7.798 0-14.12 6.366-14.12 14.221v63.992c0 7.854 6.322 14.22 14.12 14.22h64.324c7.799 0 14.121-6.366 14.121-14.22v-63.992c0-7.855-6.322-14.221-14.121-14.221z'
        fill={`url(#${gradientId})`}
        fillOpacity='0.2'
      />
    </svg>
  )
}

/**
 * Full Sim logo with icon and "Sim" text.
 * Uses the same SVG source as the landing page navbar for exact visual alignment.
 * The icon stays green (#33C482), text adapts to light/dark mode.
 */
export function SimLogoFull({ className }: SimLogoProps) {
  const gradientId = `sim-logo-full-gradient-${useId()}`

  return (
    <svg
      viewBox='0 0 71 22'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('h-7 w-auto', className)}
      aria-label='Sim'
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits='userSpaceOnUse'
          x1='171.406'
          y1='171.18'
          x2='245.831'
          y2='245.428'
        >
          <stop offset='0' />
          <stop offset='1' stopOpacity='0' />
        </linearGradient>
      </defs>
      {/* Green icon — scaled to match landing logo proportions */}
      <g transform='scale(.07483)'>
        <path
          clipRule='evenodd'
          d='m142.79 124.17c0 4.75-1.88 9.31-5.22 12.67l-.48.48c-3.33 3.37-7.86 5.25-12.58 5.25h-106.71c-9.83 0-17.81 8.03-17.81 17.92v115.41c0 9.9 7.98 17.92 17.81 17.92h114.58c9.83 0 17.8-8.03 17.8-17.92v-108.05c0-4.41 1.74-8.63 4.83-11.75 3.09-3.11 7.28-4.86 11.66-4.86h108.5c9.83 0 17.8-8.02 17.8-17.92v-115.41c0-9.9-7.97-17.92-17.8-17.92h-114.58c-9.83 0-17.8 8.03-17.8 17.92zm34.77-99.61h80.62c5.74 0 10.39 4.69 10.39 10.46v81.19c0 5.77-4.64 10.46-10.39 10.46h-80.62c-5.73 0-10.39-4.69-10.39-10.46v-81.19c0-5.78 4.66-10.46 10.39-10.46z'
          fill='#33C482'
          fillRule='evenodd'
        />
        <path
          d='m275.293 171.578h-85.187c-10.327 0-18.7 8.432-18.7 18.834v84.75c0 10.402 8.373 18.834 18.7 18.834h85.187c10.328 0 18.701-8.432 18.701-18.834v-84.75c0-10.402-8.373-18.834-18.701-18.834z'
          fill='#33C482'
        />
        <path
          d='m275.293 171.18h-85.187c-10.327 0-18.7 8.432-18.7 18.834v84.749c0 10.402 8.373 18.833 18.7 18.833h85.187c10.328 0 18.701-8.431 18.701-18.833v-84.749c0-10.402-8.373-18.834-18.701-18.834z'
          fill={`url(#${gradientId})`}
          fillOpacity='0.2'
        />
      </g>
      {/* "Sim" text — adapts to light/dark mode */}
      <g className='fill-[var(--text-primary)]'>
        <path d='M31.57 15.85h2.59c0 .71.26 1.28.78 1.71.52.41 1.22.61 2.1.61.96 0 1.7-.18 2.21-.55.52-.39.78-.9.78-1.53 0-.46-.14-.85-.43-1.16-.27-.31-.77-.56-1.49-.75l-2.47-.58c-1.25-.31-2.17-.78-2.79-1.42-.59-.64-.89-1.48-.89-2.52 0-.87.22-1.62.66-2.26.46-.64 1.08-1.13 1.87-1.48.8-.35 1.72-.52 2.76-.52s1.93.18 2.67.55c.77.37 1.36.88 1.78 1.53.44.66.67 1.44.69 2.35h-2.59c-.02-.73-.26-1.3-.72-1.71-.46-.41-1.1-.61-1.93-.61-.84 0-1.49.18-1.95.55-.46.37-.69.87-.69 1.51 0 .95.69 1.59 2.07 1.94l2.47.61c1.19.27 2.08.71 2.67 1.33.59.6.89 1.42.89 2.46 0 .89-.24 1.67-.72 2.35-.48.66-1.14 1.17-1.98 1.53-.82.35-1.8.52-2.93.52-1.65 0-2.96-.41-3.94-1.22-.98-.81-1.47-1.89-1.47-3.24z' />
        <path d='M44.51 19.96v-14.16c1.08.39 1.55.39 2.7 0v14.16zm1.32-15.09c-.48 0-.9-.17-1.26-.52-.34-.37-.52-.79-.52-1.27 0-.5.17-.93.52-1.27.36-.35.79-.52 1.26-.52.5 0 .92.17 1.26.52s.52.77.52 1.27c0 .48-.17.91-.52 1.27-.34.35-.77.52-1.26.52z' />
        <path d='M51.98 19.96h-2.7v-14.16h2.41v2.39c.29-.79.84-1.46 1.61-1.98.79-.54 1.73-.81 2.85-.81 1.25 0 2.28.34 3.1 1.01.82.68 1.36 1.57 1.61 2.69h-.49c.19-1.12.72-2.02 1.58-2.69.86-.68 1.93-1.01 3.19-1.01 1.61 0 2.87.47 3.79 1.42.92.95 1.38 2.24 1.38 3.88v9.26h-2.64v-8.6c0-1.12-.29-1.98-.86-2.58-.56-.62-1.31-.93-2.27-.93-.67 0-1.26.15-1.78.46-.5.29-.89.71-1.18 1.27-.29.56-.43 1.22-.43 1.97v8.4h-2.67v-8.63c0-1.12-.28-1.97-.83-2.55-.56-.6-1.31-.9-2.27-.9-.67 0-1.26.15-1.78.46-.5.29-.89.71-1.18 1.27-.29.54-.43 1.19-.43 1.94z' />
      </g>
    </svg>
  )
}
