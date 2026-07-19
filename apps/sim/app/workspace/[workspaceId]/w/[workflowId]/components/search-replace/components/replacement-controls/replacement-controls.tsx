'use client'

import { Button, Combobox, Input } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { WorkflowSearchReplacementOption } from '@/lib/workflows/search-replace/types'

interface ReplacementControlsProps {
  replacement: string
  compatibleResourceOptions: WorkflowSearchReplacementOption[]
  usesResourceReplacement: boolean
  eligibleCount: number
  disabled?: boolean
  isApplying?: boolean
  canReplaceActive: boolean
  canReplaceAll: boolean
  onReplacementChange: (replacement: string) => void
  onReplaceActive: () => void
  onReplaceAll: () => void
}

export function ReplacementControls({
  replacement,
  compatibleResourceOptions,
  usesResourceReplacement,
  eligibleCount,
  disabled,
  isApplying,
  canReplaceActive,
  canReplaceAll,
  onReplacementChange,
  onReplaceActive,
  onReplaceAll,
}: ReplacementControlsProps) {
  const tI18n = useTranslations('auto')
  return (
    <div className='space-y-2'>
      {usesResourceReplacement ? (
        <Combobox
          options={compatibleResourceOptions.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          value={replacement}
          onChange={onReplacementChange}
          placeholder={tI18n('choose_replacement_placeholder')}
          searchable
          searchPlaceholder={tI18n('search_resources_placeholder')}
          emptyMessage={tI18n('no_valid_replacements')}
          disabled={disabled || compatibleResourceOptions.length === 0}
        />
      ) : (
        <Input
          value={replacement}
          placeholder={tI18n('replace_input_placeholder')}
          disabled={disabled}
          onChange={(event) => onReplacementChange(event.target.value)}
        />
      )}

      <div className='flex items-center justify-between gap-2'>
        <span className='text-[var(--text-muted)] text-xs'>
          {eligibleCount} {tI18n(eligibleCount === 1 ? 'replaceable_match' : 'replaceable_matches')}
        </span>
        <div className='flex gap-1.5'>
          <Button
            className='h-8 px-2 text-xs'
            variant='default'
            disabled={disabled || isApplying || !canReplaceActive}
            onClick={onReplaceActive}
          >
            {tI18n('replace_button')}
          </Button>
          <Button
            className='h-8 px-2 text-xs'
            variant='active'
            disabled={disabled || isApplying || !canReplaceAll}
            onClick={onReplaceAll}
          >
            {isApplying ? tI18n('replacing') : tI18n('replace_all_button')}
          </Button>
        </div>
      </div>
    </div>
  )
}
