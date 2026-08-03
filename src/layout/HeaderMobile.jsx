import { IconBars, IconSearch } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { SiteLogo } from './SiteLogo'
import { CartDropdown } from './CartDropdown'
import { HeaderProfileMenu } from './HeaderProfileMenu'

/** Référence: template-parts/header-mobile.php */
export function HeaderMobile({ isLoggedIn = true }) {
  const { toggleMobilePanel, toggleSearch } = useLayout()

  return (
    <div className="bb-mobile-header-wrapper sticky top-0 z-header border-b border-bb-border bg-bb-header bb:hidden">
      <div className="bb-mobile-header flex h-header items-center gap-1 px-1.5 sm:px-2.5">
        <div className="bb-left-panel-icon-wrap shrink-0">
          <button
            type="button"
            className="push-left bb-left-panel-mobile flex h-10 w-10 items-center justify-center text-bb-header-link"
            onClick={toggleMobilePanel}
            aria-label="Open Menu"
          >
            <IconBars />
          </button>
        </div>

        <div className="mobile-logo-wrapper flex min-w-0 flex-1 justify-center px-1">
          <SiteLogo className="[&_img]:max-w-[120px] sm:[&_img]:max-w-[160px]" />
        </div>

        <div className="header-aside flex shrink-0 items-center">
          <button
            type="button"
            className="header-search-link flex h-10 w-10 items-center justify-center text-bb-header-link"
            onClick={toggleSearch}
            aria-label="Search"
          >
            <IconSearch />
          </button>
          {isLoggedIn && (
            <>
              <CartDropdown />
              <HeaderProfileMenu mode="avatar" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
