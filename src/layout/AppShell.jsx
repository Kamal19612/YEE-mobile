import { useEffect } from 'react'
import clsx from 'clsx'
import { useLocation } from 'react-router-dom'
import { useLayout } from '../context/LayoutProvider'
import { OfflineBanner } from '../components/ui/OfflineBanner'
import { PwaInstallBanner } from '../components/ui/PwaInstallBanner'
import { PushOptInBanner } from '../components/ui/PushOptInBanner'
import { LiveToastHost } from '../components/ui/LiveToastHost'
import { BuddyPanel } from './BuddyPanel'
import { Footer } from './Footer'
import { Header } from './Header'
import { HeaderMobile } from './HeaderMobile'

/**
 * Shell BuddyBoss-like :
 * - BuddyPanel fixed (plein viewport)
 * - #page décalé via ml-panel / ml-panel-open (breakpoint bb: unique)
 * - Header sticky dans #page (colonne contenu)
 */
export function AppShell({ children }) {
  const { panelOpen } = useLayout()
  const { pathname } = useLocation()
  const isImmersive = pathname.startsWith('/messages')

  // Mobile seulement : ancrer #page au visualViewport (clavier).
  // Sur desktop, position:fixed + width:100% casse ml-panel (chevauchement BuddyPanel).
  useEffect(() => {
    if (!isImmersive || typeof window === 'undefined') return undefined
    const vv = window.visualViewport
    const page = document.getElementById('page')
    if (!vv || !page) return undefined

    const mobileMq = window.matchMedia('(max-width: 799px)')
    let prevHtmlOverflow = ''
    let prevBodyOverflow = ''
    let listening = false

    const clearPageInline = () => {
      page.style.position = ''
      page.style.top = ''
      page.style.left = ''
      page.style.right = ''
      page.style.bottom = ''
      page.style.width = ''
      page.style.height = ''
      page.style.minHeight = ''
      page.style.maxHeight = ''
      page.style.transform = ''
      document.documentElement.style.removeProperty('--bb-vv-height')
      document.documentElement.style.removeProperty('--bb-keyboard-inset')
    }

    const sync = () => {
      if (!mobileMq.matches) return
      const top = Math.max(0, vv.offsetTop || 0)
      const height = Math.max(0, vv.height || window.innerHeight)
      const keyboardInset = Math.max(0, window.innerHeight - height - top)

      page.style.position = 'fixed'
      page.style.top = `${top}px`
      page.style.left = '0'
      page.style.right = '0'
      page.style.bottom = 'auto'
      page.style.width = '100%'
      page.style.height = `${height}px`
      page.style.minHeight = `${height}px`
      page.style.maxHeight = `${height}px`
      page.style.transform = ''

      document.documentElement.style.setProperty('--bb-vv-height', `${height}px`)
      document.documentElement.style.setProperty('--bb-keyboard-inset', `${keyboardInset}px`)
    }

    const enableMobile = () => {
      if (listening) return
      listening = true
      prevHtmlOverflow = document.documentElement.style.overflow
      prevBodyOverflow = document.body.style.overflow
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      sync()
      vv.addEventListener('resize', sync)
      vv.addEventListener('scroll', sync)
      window.addEventListener('orientationchange', sync)
    }

    const disableMobile = () => {
      if (!listening) {
        clearPageInline()
        return
      }
      listening = false
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      window.removeEventListener('orientationchange', sync)
      clearPageInline()
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }

    const onBreakpoint = () => {
      if (mobileMq.matches) enableMobile()
      else disableMobile()
    }

    onBreakpoint()
    mobileMq.addEventListener('change', onBreakpoint)
    return () => {
      mobileMq.removeEventListener('change', onBreakpoint)
      disableMobile()
    }
  }, [isImmersive])

  return (
    <div className={clsx('bb-buddypanel site-root', panelOpen && 'buddypanel-open')}>
      <BuddyPanel />
      <div
        id="page"
        className={clsx(
          'site flex flex-col transition-[margin] duration-panel',
          isImmersive ? 'h-dvh max-h-dvh min-h-0 overflow-hidden' : 'min-h-dvh',
          'bb:ml-panel',
          panelOpen && 'bb:ml-panel-open',
        )}
      >
        <Header />
        <HeaderMobile />
        <PwaInstallBanner />
        <PushOptInBanner />
        <OfflineBanner />
        <LiveToastHost />

        <div id="content" className="site-content flex min-h-0 flex-1 flex-col overflow-x-clip">
          <div
            className={clsx(
              'bb-container',
              isImmersive && 'flex min-h-0 flex-1 flex-col px-0 bb:px-4',
            )}
          >
            <div
              className={clsx(
                'site-content-grid',
                isImmersive ? 'flex min-h-0 flex-1 flex-col py-0' : 'py-4 bb:py-bb-7',
              )}
            >
              {children}
            </div>
          </div>
        </div>

        {!isImmersive && <Footer />}
      </div>
    </div>
  )
}
