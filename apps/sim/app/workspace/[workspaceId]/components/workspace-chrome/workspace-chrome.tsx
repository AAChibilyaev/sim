'use client'

import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@sim/emcn'
import { PanelLeft } from '@sim/emcn/icons'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/app/workspace/[workspaceId]/w/components/sidebar/sidebar'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useFullscreenOriginStore } from '@/stores/fullscreen-origin'
import { useSidebarStore } from '@/stores/sidebar/store'

const FULLSCREEN_SUFFIXES = ['/upgrade'] as const

/** Slide timing for the fullscreen sidebar collapse and content shift. */
const SLIDE_TRANSITION =
  'duration-[175ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none'

interface WorkspaceChromeProps {
  children: React.ReactNode
  /** Cookie-derived collapse state from the server layout; seeds the sidebar's first render. */
  initialSidebarCollapsed?: boolean
}

function isFullscreenPath(pathname: string | null): boolean {
  return FULLSCREEN_SUFFIXES.some((s) => pathname?.endsWith(s))
}

/**
 * Renders the workspace chrome as a single persistent tree. The sidebar is
 * always mounted; on a fullscreen route (`/upgrade`) its wrapper collapses to
 * zero width while the inner shell slides off the left edge, revealing the route
 * content. Because this component lives in the workspace layout it persists
 * across navigations, so the pathname-driven class toggle animates smoothly.
 *
 * Leaving a fullscreen route is instant: App Router swaps `children` to the
 * origin page and the fullscreen page is simply unmounted, while the sidebar
 * slides back in. There is no exit fade — the new page just loads in place.
 *
 * Because the chrome observes every pathname transition, it records the page a
 * fullscreen route was launched from into {@link useFullscreenOriginStore}. The
 * route's Back control reads that origin to return deterministically, so any
 * trigger that merely pushes a fullscreen route gets correct return-to-origin
 * without per-call-site wiring.
 *
 * On a direct load of a fullscreen route the wrapper mounts already collapsed,
 * so no slide plays (CSS transitions don't run on mount).
 */
export function WorkspaceChrome({
  children,
  initialSidebarCollapsed = false,
}: WorkspaceChromeProps) {
  const rafRef = useRef(0)

  const pathname = usePathname()
  const isFullscreen = isFullscreenPath(pathname)

  const setOrigin = useFullscreenOriginStore((s) => s.setOrigin)

  /**
   * Below the mobile breakpoint the fixed-width sidebar column would consume
   * most of the viewport, so it becomes an off-canvas drawer overlaid above the
   * content. `isMobile` is `false` on the server and the first client render, so
   * the desktop tree hydrates identically; the drawer only appears after mount.
   */
  const isMobile = useIsMobile()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const storeIsCollapsed = useSidebarStore((s) => s.isCollapsed)
  const hasHydrated = useSidebarStore((s) => s._hasHydrated)
  const syncSidebarWidth = useSidebarStore((s) => s.syncWidth)

  /**
   * Single source of collapse for the whole chrome, driving the rail's structure,
   * labels, and width. The server renders from the `sidebar_collapsed` cookie
   * (`initialSidebarCollapsed`) and the store seeds from the same cookie — after
   * the pre-paint script migrates any legacy `localStorage` flag — so prop and
   * store agree. The prop is used until the store hydrates (keeping the first
   * client render identical to the server), then the store takes over.
   */
  const isCollapsed = hasHydrated ? storeIsCollapsed : initialSidebarCollapsed

  /**
   * Suppresses sidebar transitions across the initial hydration window. The
   * pre-paint script already set the correct `--sidebar-width`, but the store
   * rehydration below re-applies it a tick later; without this guard that
   * re-apply animates the rail, reading as a collapse -> expand flash on a
   * fresh load. Applied before the rehydrate effect so the class is in place
   * ahead of the width mutation, then lifted after the first paint so
   * user-driven collapse toggles and the fullscreen slide still animate.
   */
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('sidebar-booting')
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => root.classList.remove('sidebar-booting'))
      rafRef.current = raf2
    })
    rafRef.current = raf1
    return () => {
      cancelAnimationFrame(rafRef.current)
      root.classList.remove('sidebar-booting')
    }
  }, [])

  // Hydrate the persisted width before paint (collapse comes from the cookie/prop).
  useLayoutEffect(() => {
    void useSidebarStore.persist.rehydrate()
  }, [])

  // Remember the last non-fullscreen page so a fullscreen route's Back control
  // can return there, deterministically and for any trigger.
  useEffect(() => {
    if (pathname && !isFullscreen) setOrigin(pathname)
  }, [pathname, isFullscreen, setOrigin])

  // Close the mobile drawer whenever the route changes (tapping a nav item) or
  // the viewport grows back to desktop, so a stale overlay never lingers.
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false)
  }, [isMobile])

  // Re-apply the sidebar width whenever this persistent shell sees a navigation.
  // The blocking script in the document head only runs on full page loads and
  // store rehydration only fires once, so a soft navigation can leave
  // `--sidebar-width` stuck at its `0px` default — collapsing the sidebar to
  // nothing with no reachable control to bring it back. Re-syncing here recovers
  // that state. Gated on hydration so it never clobbers the persisted value with
  // store defaults during the pre-hydration window.
  useEffect(() => {
    if (hasHydrated) syncSidebarWidth()
  }, [pathname, hasHydrated, syncSidebarWidth])

  // Re-clamp the width when the window shrinks below what the persisted width
  // allows, so the sidebar can never grow wider than the viewport permits.
  useEffect(() => {
    let rafId: number | null = null
    const onResize = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        syncSidebarWidth()
      })
    }
    window.addEventListener('resize', onResize)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [syncSidebarWidth])

  return (
    <div className='flex min-h-0 flex-1'>
      <div
        className={cn(
          'sidebar-shell-outer overflow-hidden',
          isMobile
            ? [
                'fixed inset-y-0 left-0 z-50 w-[248px] max-w-[85vw] border-[var(--border)] border-r bg-[var(--surface-1)] shadow-xl transition-transform',
                SLIDE_TRANSITION,
                mobileSidebarOpen && !isFullscreen ? 'translate-x-0' : '-translate-x-full',
              ]
            : [
                'shrink-0 transition-[width]',
                SLIDE_TRANSITION,
                isFullscreen ? 'w-0' : 'w-[var(--sidebar-width)]',
              ]
        )}
        style={isMobile ? ({ '--sidebar-width': '248px' } as CSSProperties) : undefined}
        data-collapsed={(!isMobile && isCollapsed) || undefined}
        aria-hidden={(isMobile ? !mobileSidebarOpen : isFullscreen) || undefined}
        suppressHydrationWarning
      >
        <div
          className={cn(
            'sidebar-shell-inner h-full transition-transform',
            isMobile ? 'w-full' : 'w-[var(--sidebar-width)] shrink-0',
            SLIDE_TRANSITION,
            !isMobile && isFullscreen && '-translate-x-full'
          )}
        >
          <Sidebar isCollapsed={isMobile ? false : isCollapsed} />
        </div>
      </div>

      {isMobile && mobileSidebarOpen && !isFullscreen && (
        <button
          type='button'
          aria-label='Close menu'
          onClick={() => setMobileSidebarOpen(false)}
          className='fixed inset-0 z-40 bg-black/40'
        />
      )}

      {isMobile && !mobileSidebarOpen && !isFullscreen && (
        <button
          type='button'
          aria-label='Open menu'
          onClick={() => setMobileSidebarOpen(true)}
          className='fixed top-[calc(env(safe-area-inset-top)_+_0.75rem)] left-[calc(env(safe-area-inset-left)_+_0.75rem)] z-30 flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-icon)] shadow-md'
        >
          <PanelLeft className='size-[18px]' />
        </button>
      )}

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col p-[8px] transition-[padding]',
          SLIDE_TRANSITION,
          !isFullscreen && !isMobile && 'pl-0'
        )}
      >
        <div className='flex-1 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--bg)]'>
          {children}
        </div>
      </div>
    </div>
  )
}
