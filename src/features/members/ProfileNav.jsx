import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

export function ProfileNav({ memberId, isOwn }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'activity', label: t('members.tabs.timeline'), to: `/members/${memberId}` },
    { id: 'profile', label: t('members.tabs.about'), to: `/members/${memberId}/profile` },
    { id: 'friends', label: t('members.tabs.followers'), to: `/members/${memberId}/friends` },
    { id: 'groups', label: t('members.tabs.groups'), to: `/members/${memberId}/groups` },
    { id: 'institutions', label: t('members.tabs.institutions'), to: `/members/${memberId}/institutions` },
  ]

  if (isOwn) {
    tabs.push(
      { id: 'notifications', label: t('members.tabs.notifications'), to: `/members/${memberId}/notifications` },
      { id: 'invites', label: t('members.tabs.invites'), to: `/members/${memberId}/invites` },
      { id: 'settings', label: t('members.tabs.settings'), to: `/members/${memberId}/settings` },
    )
  }

  return (
    <nav
      className="main-navs bp-navs no-ajax bp-single-vertical-nav mb-5 rounded-bb border border-bb-border bg-bb-content"
      role="navigation"
      aria-label={t('members.menu')}
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
