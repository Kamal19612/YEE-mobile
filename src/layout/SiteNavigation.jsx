import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { navItems } from '../data/demoData'
import { IconEllipsis } from '../components/icons'

export function SiteNavigation({ items = navItems }) {
  return (
    <nav id="site-navigation" className="main-navigation hidden flex-1 bb:block" data-menu-space="120">
      <div id="primary-navbar" className="flex items-center gap-1">
        <ul id="primary-menu" className="primary-menu bb-primary-overflow m-0 flex list-none items-center gap-1 p-0">
          {items.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  clsx(
                    'block rounded-bb-inner px-3 py-2 text-bb-base font-medium transition-colors',
                    isActive
                      ? 'text-bb-primary'
                      : 'text-bb-header-link hover:text-bb-header-link-hover',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div id="navbar-collapse" className="relative">
          <button
            type="button"
            className="more-button flex h-9 w-9 items-center justify-center text-bb-header-link"
          >
            <IconEllipsis />
            <span className="screen-reader-text">More options</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
