import { IconBars, IconSearch } from '../components/icons'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { useLayout } from '../context/LayoutProvider'
import { HeaderProfileMenu } from './HeaderProfileMenu'
import { useTranslation } from 'react-i18next'

/**
 * Header mobile — sticky ; drawer BuddyPanel en z-mobile-panel au-dessus.
 * Même breakpoint bb: que la sidebar desktop (cachée ici, visible là).
 */
export function HeaderMobile() {
  const { t } = useTranslation()
  const { toggleMobilePanel, toggleSearch } = useLayout()

  return (
    <div className="bb-mobile-header-wrapper sticky top-0 z-header border-b border-bb-border bg-bb-header bb:hidden">
      <div className="flex h-header items-center gap-1 px-2 sm:px-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-bb-inner text-bb-header-link hover:bg-bb-alt"
          onClick={toggleMobilePanel}
          aria-label="Ouvrir le menu"
          aria-expanded={false}
        >
          <IconBars />
        </button>

        <div className="min-w-0 flex-1 px-1">
          <span className="block truncate text-bb-sm font-semibold text-bb-heading sm:text-bb-md">
            {t('app.name')}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <LanguageSwitcher />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-header-link hover:bg-bb-alt"
            onClick={toggleSearch}
            aria-label={t('nav.search')}
          >
            <IconSearch />
          </button>
          <HeaderProfileMenu mode="avatar" />
        </div>
      </div>
    </div>
  )
}
