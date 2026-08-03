import { IconSidebar } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { HeaderAside } from './HeaderAside'
import { HeaderSearch } from './HeaderSearch'
import { SiteLogo } from './SiteLogo'
import { SiteNavigation } from './SiteNavigation'

/** Référence: template-parts/header.php (header style 1 / default) */
export function Header({ isLoggedIn = true }) {
  const { togglePanel } = useLayout()

  return (
    <>
      <header
        id="masthead"
        className="site-header site-header--bb sticky top-0 z-header hidden bg-bb-header shadow-header bb:block"
      >
        <div className="bb-container site-header-container flex h-header default-header items-center gap-4">
          <button
            type="button"
            className="bb-toggle-panel flex h-10 w-10 items-center justify-center text-bb-header-link hover:text-bb-primary"
            onClick={togglePanel}
            aria-label="Toggle Side Panel"
          >
            <IconSidebar />
            <span className="screen-reader-text">Toggle Side Panel</span>
          </button>

          <SiteLogo />
          <SiteNavigation />
          <HeaderAside isLoggedIn={isLoggedIn} />
        </div>
      </header>
      <HeaderSearch />
    </>
  )
}
