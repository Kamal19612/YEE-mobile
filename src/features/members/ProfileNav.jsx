import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

export function ProfileNav({ memberId, isOwn }) {
  const tabs = [
    { id: 'activity', label: 'Timeline', to: `/members/${memberId}` },
    { id: 'profile', label: 'About', to: `/members/${memberId}/profile` },
    { id: 'friends', label: 'Friends', to: `/members/${memberId}/friends` },
    { id: 'groups', label: 'Groups', to: `/members/${memberId}/groups` },
  ]

  if (isOwn) {
    tabs.push(
      { id: 'notifications', label: 'Notifications', to: `/members/${memberId}/notifications` },
      { id: 'invites', label: 'Invites', to: `/members/${memberId}/invites` },
      { id: 'settings', label: 'Settings', to: `/members/${memberId}/settings` },
    )
  }

  return (
    <nav
      className="main-navs bp-navs no-ajax bp-single-vertical-nav mb-5 rounded-bb border border-bb-border bg-bb-content"
      role="navigation"
      aria-label="Profile menu"
    >
      <ul className="bb-scroll-tabs m-0 list-none gap-0 p-0">
        {tabs.map((tab) => (
          <li key={tab.id} className="shrink-0">
            <NavLink
              to={tab.to}
              end={tab.id === 'activity'}
              className={({ isActive }) =>
                clsx(
                  'block whitespace-nowrap border-b-2 px-3 py-3 text-bb-sm font-medium transition-colors sm:px-4',
                  isActive
                    ? 'border-bb-primary text-bb-primary'
                    : 'border-transparent text-bb-text hover:text-bb-heading',
                )
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
