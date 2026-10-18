import clsx from 'clsx'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IconActivity,
  IconBook,
  IconCalendar,
  IconClose,
  IconGlobe,
  IconGroup,
  IconShield,
  IconSidebar,
  IconUsers,
} from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { useAuth } from '../hooks/useAuth'
import { panelItemDefs } from '../data/layoutData'
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher'
import { SiteLogo } from './SiteLogo'

const iconMap = {
  activity: IconActivity,
  users: IconUsers,
  group: IconGroup,
  globe: IconGlobe,
  calendar: IconCalendar,
  book: IconBook,
  shield: IconShield,
}

const PRIMARY_IDS = ['stories', 'members', 'groups', 'institutions', 'events', 'resources']
const ADMIN_IDS = ['admin-accounts']

function isItemActive(pathname, href) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavSection({ title, children, expanded }) {
  return (
    <div className="mb-3">
      {expanded && title && (
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-bb-muted">
          {title}
        </p>
      )}
      <ul className="m-0 list-none space-y-0.5 p-0">{children}</ul>
    </div>
  )
}

/**
 * BuddyPanel — fixed full-height (réf. buddypanel.php)
 * Aligné au header via --bb-header-height / breakpoint bb: / z-index tokens
 */
export function BuddyPanel({ items = panelItemDefs }) {
  const { t } = useTranslation()
  const { panelOpen, togglePanel, mobilePanelOpen, closeMobilePanel } = useLayout()
  const { pathname } = useLocation()
  const { user } = useAuth()

  const visibleItems = items.filter((item) => !item.adminOnly || user?.isSiteAdmin)
  const primary = visibleItems.filter((i) => PRIMARY_IDS.includes(i.id))
  const admin = visibleItems.filter((i) => ADMIN_IDS.includes(i.id))

  const renderItem = (item, { onNavigate, forceExpanded = false } = {}) => {
    const Icon = iconMap[item.icon] || IconActivity
    const active = isItemActive(pathname, item.href)
    const expanded = forceExpanded || panelOpen
    const label = t(item.labelKey)
    return (
      <li key={item.id} className="relative">
        <NavLink
          to={item.href}
          onClick={onNavigate}
          className={clsx(
            'flex items-center gap-3 rounded-bb-inner px-3 py-2.5 transition-all duration-150 ease-bb',
            !expanded && 'justify-center px-0',
            active
              ? 'bg-bb-sidenav-active text-white shadow-[0_8px_18px_rgba(47,91,255,0.28)]'
              : 'text-bb-sidenav-text hover:bg-bb-sidenav-hover',
          )}
          title={label}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {expanded && (
            <>
              <span className="link-text min-w-0 flex-1 truncate text-bb-sm font-medium">{label}</span>
              {item.count > 0 && (
                <span
                  className={clsx(
                    'count rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    active ? 'bg-white text-bb-primary' : 'bg-bb-alt text-bb-heading',
                  )}
                >
                  {item.count}
                </span>
              )}
            </>
          )}
          {!expanded && item.count > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-bb-danger" />
          )}
        </NavLink>
      </li>
    )
  }

  const navBody = (opts) => (
    <>
      <NavSection title={t('panel.sectionMain')} expanded={opts?.forceExpanded || panelOpen}>
        {primary.map((item) => renderItem(item, opts))}
      </NavSection>
      {admin.length > 0 && (
        <>
          {(opts?.forceExpanded || panelOpen) && <div className="mx-3 mb-3 border-t border-bb-border" />}
          <NavSection title={t('panel.sectionAdmin')} expanded={opts?.forceExpanded || panelOpen}>
            {admin.map((item) => renderItem(item, opts))}
          </NavSection>
        </>
      )}
    </>
  )

  return (
    <>
      {/* Desktop rail — fixed, même hauteur de tête que le header */}
      <aside
        className={clsx(
          'buddypanel buddypanel--toggle-on fixed bottom-0 left-0 top-0 z-panel hidden flex-col border-r border-bb-border bb-surface-glass transition-[width] duration-panel bb:flex',
          panelOpen ? 'w-panel-open' : 'w-panel',
        )}
        aria-label={t('panel.mainNav')}
      >
        <header
          className={clsx(
            'panel-head flex h-header shrink-0 items-center border-b border-bb-border',
            panelOpen ? 'gap-1.5 px-3' : 'justify-center px-1',
          )}
        >
          {panelOpen ? (
            <>
              {/* Logo lisible uniquement panel ouvert (ovale ~2:1 incompatible avec le rail 68px). */}
              <div className="flex h-10 min-h-0 min-w-0 flex-1 items-center overflow-hidden">
                <SiteLogo fill className="h-full w-full max-w-[10.5rem]" />
              </div>
              <button
                type="button"
                className="bb-toggle-panel flex h-9 w-9 shrink-0 items-center justify-center rounded-bb-inner text-bb-sidenav-text hover:bg-bb-sidenav-hover hover:text-bb-primary"
                onClick={togglePanel}
                aria-label={t('panel.collapse')}
                aria-expanded={true}
              >
                <IconSidebar />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="bb-toggle-panel flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-sidenav-text hover:bg-bb-sidenav-hover hover:text-bb-primary"
              onClick={togglePanel}
              aria-label={t('panel.open')}
              aria-expanded={false}
              title={t('panel.open')}
            >
              <IconSidebar />
            </button>
          )}
        </header>

        <div
          className={clsx(
            'side-panel-inner flex-1 overflow-y-auto overscroll-contain pb-4',
            panelOpen ? 'px-2 pt-3' : 'px-1.5 pt-3',
          )}
        >
          {navBody()}
        </div>

        {panelOpen && (
          <footer className="shrink-0 border-t border-bb-border bg-bb-header px-4 py-3">
            <p className="m-0 text-[11px] leading-snug text-bb-muted">{t('app.tagline')}</p>
          </footer>
        )}
      </aside>

      {/* Mobile drawer — au-dessus du header (z-mobile-panel > z-header) */}
      {mobilePanelOpen && (
        <div className="bb:hidden">
          <button
            type="button"
            className="fixed inset-0 z-mobile bg-black/40"
            aria-label={t('panel.close')}
            onClick={closeMobilePanel}
          />
          <aside
            className="buddypanel fixed bottom-0 left-0 top-0 z-mobile-panel flex w-[min(100%-3rem,260px)] max-w-[85%] flex-col bb-surface-glass shadow-panel"
            style={{ paddingTop: 'var(--bb-safe-top)' }}
            role="dialog"
            aria-modal="true"
            aria-label={t('panel.mainNav')}
          >
            <header className="panel-head flex h-14 shrink-0 items-center gap-2 border-b border-bb-border bg-bb-header px-3">
              <div className="flex h-9 min-h-0 min-w-0 flex-1 items-center overflow-hidden">
                <SiteLogo fill className="h-full w-full" />
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-bb-inner text-bb-sidenav-text touch-manipulation hover:bg-bb-sidenav-hover"
                onClick={closeMobilePanel}
                aria-label={t('panel.close')}
              >
                <IconClose />
              </button>
            </header>
            <div className="side-panel-inner flex-1 overflow-y-auto overscroll-contain px-2 pt-3 pb-4">
              {navBody({ onNavigate: closeMobilePanel, forceExpanded: true })}
            </div>
            <footer className="shrink-0 border-t border-bb-border px-4 pt-3 pb-[max(0.75rem,var(--bb-safe-bottom))] min-[400px]:hidden">
              <LanguageSwitcher />
            </footer>
          </aside>
        </div>
      )}
    </>
  )
}
