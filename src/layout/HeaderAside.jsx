import { IconSearch } from '../components/icons'
import { Button } from '../components/ui/Button'
import { useLayout } from '../context/LayoutProvider'
import { CartDropdown } from './CartDropdown'
import { HeaderProfileMenu } from './HeaderProfileMenu'
import { MessagesDropdown } from './MessagesDropdown'
import { NotificationDropdown } from './NotificationDropdown'

export function HeaderAside({ isLoggedIn = true }) {
  const { toggleSearch } = useLayout()

  return (
    <div id="header-aside" className="header-aside ml-auto">
      <div className="header-aside-inner flex items-center gap-3">
        {isLoggedIn ? (
          <>
            <button
              type="button"
              className="header-search-link hidden h-10 w-10 items-center justify-center text-bb-header-link hover:text-bb-header-link-hover bb:inline-flex"
              onClick={toggleSearch}
              aria-label="Search"
            >
              <IconSearch />
            </button>
            <span className="bb-separator hidden h-6 w-px bg-bb-border bb:block" />
            <MessagesDropdown />
            <NotificationDropdown />
            <CartDropdown />
            <HeaderProfileMenu />
          </>
        ) : (
          <>
            <button
              type="button"
              className="header-search-link text-bb-header-link hover:text-bb-header-link-hover"
              onClick={toggleSearch}
              aria-label="Search"
            >
              <IconSearch />
            </button>
            <span className="search-separator bb-separator h-6 w-px bg-bb-border" />
            <CartDropdown />
            <div className="bb-header-buttons flex items-center gap-2">
              <Button as="a" href="#" variant="link" size="sm" className="signin-button">
                Sign in
              </Button>
              <Button as="a" href="#" variant="primary" size="sm" className="signup">
                Sign up
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
