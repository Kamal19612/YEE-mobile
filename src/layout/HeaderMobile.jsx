import { IconBars, IconSearch } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { SiteLogo } from './SiteLogo'
import { MessagesDropdown } from './MessagesDropdown'
import { NotificationDropdown } from './NotificationDropdown'
import { HeaderProfileMenu } from './HeaderProfileMenu'

/** Référence: template-parts/header-mobile.php */
export function HeaderMobile({ isLoggedIn = true }) {
  const { toggleMobilePanel, toggleSearch } = useLayout()

  return (
    <div className="bb-mobile-header-wrapper sticky top-0 z-header border-b border-bb-border bg-bb-header bb:hidden">
      <div className="bb-mobile-header flex h-header items-center px-2.5">
        <div className="bb-left-panel-icon-wrap">
          <button
            type="button"
            className="push-left bb-left-panel-mobile flex h-10 w-10 items-center justify-center text-bb-header-link"
            onClick={toggleMobilePanel}
            aria-label="Open Menu"
          >
            <IconBars />
          </button>
        </div>

        <div className="mobile-logo-wrapper flex flex-1 justify-center">
          <SiteLogo />
        </div>

        <div className="header-aside flex items-center gap-2">
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
              <MessagesDropdown />
              <NotificationDropdown />
              <HeaderProfileMenu mode="avatar" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
