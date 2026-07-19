'use client'

import { useEffect, useState } from 'react'

/**
 * Tailwind's `md` breakpoint (768px) — the width below which the workspace
 * chrome switches to its mobile layout (off-canvas sidebar, overlay panels).
 */
export const MOBILE_BREAKPOINT_PX = 768 as const

/**
 * Tracks whether the viewport is narrower than {@link MOBILE_BREAKPOINT_PX}.
 *
 * Returns `false` on the server and the first client render so hydration stays
 * deterministic (SSR always renders the desktop tree); the real value is applied
 * after mount via `matchMedia`, and updates live as the viewport crosses the
 * breakpoint. Consumers that gate layout on this should treat the initial
 * desktop render as a one-frame transition on mobile, not a flash to guard.
 *
 * @param breakpointPx - Optional override for the max-width breakpoint in px.
 */
export function useIsMobile(breakpointPx: number = MOBILE_BREAKPOINT_PX): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [breakpointPx])

  return isMobile
}
