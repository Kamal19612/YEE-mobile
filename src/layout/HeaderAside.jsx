import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconSearch } from '../components/icons'
import { Button } from '../components/ui/Button'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { useLayout } from '../context/LayoutProvider'
import { useAuth } from '../hooks/useAuth'
import { HeaderProfileMenu } from './HeaderProfileMenu'
import { MessagesDropdown } from './MessagesDropdown'
import { NotificationDropdown } from './NotificationDropdown'

export function HeaderAside() {
  const { t } = useTranslation()
  const { toggleSearch } = useLayout()
  const { isAuthenticated } = useAuth()

  return (
    <div id="header-aside" className="header-aside ml-auto">
      <div className="header-aside-inner flex items-center gap-2 bb:gap-3">
        <LanguageSwitcher className="hidden bb:inline-flex" />
        {isAuthenticated ? (
          <>
            <button
              type="button"
              className="header-search-link hidden h-10 w-10 items-center justify-center text-bb-header-link hover:text-bb-header-link-hover bb:inline-flex"
              onClick={toggleSearch}
              aria-label={t('nav.search')}
            >
              <IconSearch />
            </button>
            <span className="bb-separator hidden h-6 w-px bg-bb-border bb:block" />
            <MessagesDropdown />
            <NotificationDropdown />
            <HeaderProfileMenu />
          </>
        ) : (
          <>
            <button
              type="button"
              className="header-search-link text-bb-header-link hover:text-bb-header-link-hover"
              onClick={toggleSearch}
              aria-label={t('nav.search')}
            >
              <IconSearch />
            </button>
            <span className="search-separator bb-separator h-6 w-px bg-bb-border" />
            <div className="bb-header-buttons flex items-center gap-2">
              <Button as={Link} to="/login" variant="link" size="sm" className="signin-button">
                {t('auth.signin')}
              </Button>
              <Button as={Link} to="/register" variant="primary" size="sm" className="signup">
                {t('auth.signup')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
