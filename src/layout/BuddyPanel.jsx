import clsx from 'clsx'
import { NavLink, useLocation } from 'react-router-dom'
import {
  IconActivity,
  IconBadge,
  IconBell,
  IconBook,
  IconBriefcase,
  IconCalendar,
  IconCart,
  IconClose,
  IconForum,
  IconGroup,
  IconInbox,
  IconSidebar,
  IconUsers,
} from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { panelItems } from '../data/demoData'
import { SiteLogo } from './SiteLogo'

const iconMap = {
  activity: IconActivity,
  users: IconUsers,
  group: IconGroup,
  forum: IconForum,
  inbox: IconInbox,
  bell: IconBell,
  book: IconBook,
  calendar: IconCalendar,
  briefcase: IconBriefcase,
  cart: IconCart,
  badge: IconBadge,
}

function isItemActive(pathname, href) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Référence: template-parts/buddypanel.php */
export function BuddyPanel({ items = panelItems }) {
  const { panelOpen, togglePanel, mobilePanelOpen, closeMobilePanel } = useLayout()
  const { pathname } = useLocation()

  const renderItems = ({ onNavigate, forceExpanded = false } = {}) =>
    items.map((item) => {
      const Icon = iconMap[item.icon] || IconActivity
      const active = isItemActive(pathname, item.href)
      const expanded = forceExpanded || panelOpen
      return (
        <li key={item.id}>
          <NavLink
            to={item.href}
            onClick={onNavigate}
            className={clsx(
              'flex items-center gap-3 rounded-bb-inner px-3 py-2.5 transition-colors',
              active
                ? 'bg-bb-sidenav-active text-white'
                : 'text-bb-sidenav-text hover:bg-bb-sidenav-hover',
            )}
            title={item.label}
          >
            <Icon className="shrink-0" />
            <span
              className={clsx('link-text truncate text-bb-sm font-medium', !expanded && 'sr-only')}
            >
              {item.label}
            </span>
            {item.count > 0 && expanded && (
              <span
                className={clsx(
                  'count ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-white text-bb-primary' : 'bg-bb-alt text-bb-heading',
                )}
              >
                {item.count}
              </span>
            )}
          </NavLink>
        </li>
      )
    })

  return (
    <>
      <aside
        className={clsx(
          'buddypanel buddypanel--toggle-on fixed bottom-0 left-0 top-0 z-panel hidden flex-col bg-bb-sidenav shadow-panel transition-[width] duration-panel bb:flex',
          panelOpen ? 'w-panel-open' : 'w-panel',
        )}
      >
        <header className="panel-head flex h-header items-center px-3">
          <button
            type="button"
            className="bb-toggle-panel flex h-10 w-10 items-center justify-center text-bb-sidenav-text hover:text-bb-primary"
            onClick={togglePanel}
            aria-label="Toggle Side Panel"
          >
            <IconSidebar />
          </button>
        </header>

        {panelOpen && (
          <div className="px-4 pb-3">
            <SiteLogo />
          </div>
        )}

        <div className="side-panel-inner flex-1 overflow-y-auto px-2 pb-4">
          <div className="side-panel-menu-container">
            <ul
              id="buddypanel-menu"
              className={clsx(
                'buddypanel-menu side-panel-menu m-0 list-none p-0',
                panelOpen && 'has-section-menu',
              )}
            >
              {renderItems()}
            </ul>
          </div>
        </div>
      </aside>

      {mobilePanelOpen && (
        <div className="bb:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[620] bg-black/40"
            aria-label="Close menu overlay"
            onClick={closeMobilePanel}
          />
          <aside className="buddypanel fixed bottom-0 left-0 top-0 z-[621] flex w-[min(100vw-3rem,230px)] max-w-[85vw] flex-col bg-bb-sidenav shadow-panel">
            <header className="panel-head flex h-header items-center justify-between px-3">
              <SiteLogo />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center text-bb-sidenav-text"
                onClick={closeMobilePanel}
                aria-label="Close Menu"
              >
                <IconClose />
              </button>
            </header>
            <div className="side-panel-inner flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
              <ul className="m-0 list-none p-0">
                {renderItems({ onNavigate: closeMobilePanel, forceExpanded: true })}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
