import { useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { IconBars, IconSearch } from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { useLayout } from '../context/LayoutProvider'
import { HeaderProfileMenu } from './HeaderProfileMenu'
import { MessagesDropdown } from './MessagesDropdown'
import { NotificationDropdown } from './NotificationDropdown'
import { SiteLogo } from './SiteLogo'
import { useTranslation } from 'react-i18next'

/**
 * Header mobile — sticky ; drawer BuddyPanel en z-mobile-panel au-dessus.
 * Langue dans le drawer uniquement ; touch targets 44px.
 * Masqué dans un fil de messagerie pour maximiser la zone de chat + clavier.
 */
export function HeaderMobile() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { toggleMobilePanel, toggleSearch } = useLayout()
  const { pathname } = useLocation()
  const hideForMessageThread = /\/messages\/[^/]+/.test(pathname)

  return (
    <div
      className={clsx(
        'bb-mobile-header-wrapper sticky top-0 z-header border-b border-bb-border bb-surface-glass bb:hidden',
        hideForMessageThread && 'hidden',
      )}
      style={{ paddingTop: 'var(--bb-safe-top)' }}
    >
      <div className="flex h-14 items-center gap-2 px-2 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-bb-inner text-bb-header-link touch-manipulation hover:bg-bb-alt"
            onClick={toggleMobilePanel}
            aria-label={t('common.openMenu')}
            aria-expanded={false}
          >
            <IconBars />
          </button>

          <div className="flex h-8 min-w-0 flex-1 items-center overflow-hidden sm:h-9">
            <SiteLogo fill className="h-full w-full max-w-[8.75rem] sm:max-w-[10.5rem]" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-bb-inner text-bb-header-link touch-manipulation hover:bg-bb-alt"
            onClick={toggleSearch}
            aria-label={t('nav.search')}
          >
            <IconSearch />
          </button>
          {isAuthenticated ? (
            <>
              <MessagesDropdown />
              <NotificationDropdown />
              <HeaderProfileMenu mode="avatar" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
