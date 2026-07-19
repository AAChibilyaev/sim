'use client'

import { type CSSProperties, useEffect, useState } from 'react'
import { cn } from '@sim/emcn'
import { PanelLeft } from '@sim/emcn/icons'
import { Panel } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel'
import { useIsMobile } from '@/hooks/use-is-mobile'

/** Slide timing matched to the sidebar drawer for a consistent feel. */
const SLIDE_TRANSITION =
  'duration-[175ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none'

/** Caps the drawer width on phones so it never exceeds the viewport. */
const MOBILE_DRAWER_STYLE = { '--panel-width': 'min(360px, 90vw)' } as CSSProperties

/**
 * Hosts the workflow {@link Panel}. On desktop it renders the panel unchanged as
 * a flex sibling of the canvas. Below the mobile breakpoint the fixed-width panel
 * would leave no room for the canvas, so it becomes a right-edge drawer: closed
 * by default (canvas full-width), opened by a floating control, and dismissed by
 * a backdrop tap. `useIsMobile` is `false` on the server and first client render,
 * so the desktop output is byte-identical and hydration stays deterministic.
 */
export function MobilePanelHost() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  // Never leave the drawer stuck open when the viewport grows back to desktop.
  useEffect(() => {
    if (!isMobile) setOpen(false)
  }, [isMobile])

  if (!isMobile) return <Panel />

  return (
    <>
      {open && (
        <button
          type='button'
          aria-label='Close panel'
          onClick={() => setOpen(false)}
          className='fixed inset-0 z-40 bg-black/40'
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-40 flex overflow-hidden shadow-xl transition-transform',
          SLIDE_TRANSITION,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={MOBILE_DRAWER_STYLE}
        aria-hidden={!open || undefined}
      >
        <Panel />
      </div>
      {!open && (
        <button
          type='button'
          aria-label='Open panel'
          onClick={() => setOpen(true)}
          className='fixed top-[calc(env(safe-area-inset-top)_+_0.75rem)] right-[calc(env(safe-area-inset-right)_+_0.75rem)] z-30 flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-icon)] shadow-md'
        >
          <PanelLeft className='-scale-x-100 size-[18px]' />
        </button>
      )}
    </>
  )
}
