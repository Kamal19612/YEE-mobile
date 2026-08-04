import clsx from 'clsx'
import { useLayout } from '../context/LayoutProvider'
import { OfflineBanner } from '../components/ui/OfflineBanner'
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

  return (
    <div className={clsx('bb-buddypanel site-root', panelOpen && 'buddypanel-open')}>
      <BuddyPanel />
      <div
        id="page"
        className={clsx(
          'site flex min-h-screen flex-col transition-[margin] duration-panel',
          'bb:ml-panel',
          panelOpen && 'bb:ml-panel-open',
        )}
      >
        <Header />
        <HeaderMobile />
        <OfflineBanner />

        <div id="content" className="site-content flex-1 overflow-x-hidden">
          <div className="bb-container">
            <div className="bb-grid site-content-grid py-4 bb:py-bb-7">{children}</div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  )
}
