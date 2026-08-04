import clsx from 'clsx'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  IconActivity,
  IconBell,
  IconBook,
  IconClose,
  IconForum,
  IconGroup,
  IconInbox,
  IconShield,
  IconSidebar,
  IconUsers,
} from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { panelItemDefs } from '../data/demoData'
import { SiteLogo } from './SiteLogo'

const iconMap = {
  activity: IconActivity,
  users: IconUsers,
  group: IconGroup,
  forum: IconForum,
  inbox: IconInbox,
  bell: IconBell,
  book: IconBook,
  shield: IconShield,
}

const PRIMARY_IDS = ['stories', 'members', 'groups', 'forums', 'resources']
const SECONDARY_IDS = ['messages', 'notifications', 'moderation']

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

  const primary = items.filter((i) => PRIMARY_IDS.includes(i.id))
  const secondary = items.filter((i) => SECONDARY_IDS.includes(i.id))

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
            'flex items-center gap-3 rounded-bb-inner px-3 py-2.5 transition-colors duration-150',
            !expanded && 'justify-center px-0',
            active
              ? 'bg-bb-sidenav-active text-white'
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
      {(opts?.forceExpanded || panelOpen) && <div className="mx-3 mb-3 border-t border-bb-border" />}
      <NavSection title={t('panel.sectionAccount')} expanded={opts?.forceExpanded || panelOpen}>
        {secondary.map((item) => renderItem(item, opts))}
      </NavSection>
    </>
  )

  return (
    <>
      {/* Desktop rail — fixed, même hauteur de tête que le header */}
      <aside
        className={clsx(
          'buddypanel buddypanel--toggle-on fixed bottom-0 left-0 top-0 z-panel hidden flex-col border-r border-bb-border bg-bb-sidenav transition-[width] duration-panel bb:flex',
          panelOpen ? 'w-panel-open' : 'w-panel',
        )}
        aria-label="Navigation principale"
      >
        <header
          className={clsx(
            'panel-head flex h-header shrink-0 items-center border-b border-bb-border bg-bb-header',
            panelOpen ? 'gap-2 px-3' : 'justify-center px-1',
          )}
        >
          {panelOpen ? (
            <>
              <div className="min-w-0 flex-1">
                <SiteLogo />
              </div>
              <button
                type="button"
                className="bb-toggle-panel flex h-9 w-9 shrink-0 items-center justify-center rounded-bb-inner text-bb-sidenav-text hover:bg-bb-sidenav-hover hover:text-bb-primary"
                onClick={togglePanel}
                aria-label="Réduire le panneau"
                aria-expanded={true}
              >
                <IconSidebar />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="flex h-full w-full items-center justify-center text-bb-sidenav-text hover:opacity-90"
              onClick={togglePanel}
              aria-label="Ouvrir le panneau"
              aria-expanded={false}
              title={t('app.name')}
            >
              <SiteLogo compact as="span" />
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
            aria-label="Fermer le menu"
            onClick={closeMobilePanel}
          />
          <aside
            className="buddypanel fixed bottom-0 left-0 top-0 z-mobile-panel flex w-[min(100vw-3rem,260px)] max-w-[85vw] flex-col bg-bb-sidenav shadow-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <header className="panel-head flex h-header shrink-0 items-center justify-between gap-2 border-b border-bb-border bg-bb-header px-3">
              <div className="min-w-0 flex-1">
                <SiteLogo />
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-bb-inner text-bb-sidenav-text hover:bg-bb-sidenav-hover"
                onClick={closeMobilePanel}
                aria-label="Fermer le menu"
              >
                <IconClose />
              </button>
            </header>
            <div className="side-panel-inner flex-1 overflow-y-auto overscroll-contain px-2 pt-3 pb-4">
              {navBody({ onNavigate: closeMobilePanel, forceExpanded: true })}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
