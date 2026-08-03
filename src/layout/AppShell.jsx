import clsx from 'clsx'
import { useLayout } from '../context/LayoutProvider'
import { BuddyPanel } from './BuddyPanel'
import { Footer } from './Footer'
import { Header } from './Header'
import { HeaderMobile } from './HeaderMobile'

export function AppShell({ children, isLoggedIn = true }) {
  const { panelOpen } = useLayout()

  return (
    <div className={clsx('bb-buddypanel site-root', panelOpen && 'buddypanel-open')}>
      <BuddyPanel />
      <div
        id="page"
        className={clsx(
          'site flex min-h-screen flex-col overflow-x-hidden transition-[margin] duration-panel',
          panelOpen ? 'bb:ml-panel-open' : 'bb:ml-panel',
        )}
      >
        <Header isLoggedIn={isLoggedIn} />
        <HeaderMobile isLoggedIn={isLoggedIn} />

        <div id="content" className="site-content flex-1">
          <div className="bb-container">
            <div className="bb-grid site-content-grid py-4 bb:py-bb-7">{children}</div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  )
}
