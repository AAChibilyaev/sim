'use client'

import { useEffect } from 'react'
import { useBrandConfig } from '@/ee/whitelabeling/branding'
import { useAnimatedPlaceholder } from '@/hooks/use-animated-placeholder'

interface AnimatedPlaceholderEffectProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  isInitialView: boolean
}

export function AnimatedPlaceholderEffect({
  textareaRef,
  isInitialView,
}: AnimatedPlaceholderEffectProps) {
  const brand = useBrandConfig()
  const animatedPlaceholder = useAnimatedPlaceholder(isInitialView)
  const placeholder = isInitialView ? animatedPlaceholder : `Send message to ${brand.name}`

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.placeholder = placeholder
    }
  }, [placeholder, textareaRef])

  return null
}
