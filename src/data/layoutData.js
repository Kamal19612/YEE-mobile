/** Layout navigation definitions — AFRICAN EVALUATORS DATABASE app shell */

export const panelItemDefs = [
  { id: 'stories', href: '/', icon: 'activity', count: 0, labelKey: 'panel.stories' },
  { id: 'members', href: '/members', icon: 'users', count: 0, labelKey: 'panel.members' },
  { id: 'groups', href: '/groups', icon: 'group', count: 0, labelKey: 'panel.groups' },
  { id: 'institutions', href: '/institutions', icon: 'globe', count: 0, labelKey: 'panel.institutions' },
  { id: 'events', href: '/events', icon: 'calendar', count: 0, labelKey: 'panel.events' },
  { id: 'resources', href: '/resources', icon: 'book', count: 0, labelKey: 'panel.resources' },
  {
    id: 'admin-accounts',
    href: '/admin/accounts',
    icon: 'shield',
    count: 0,
    labelKey: 'panel.adminAccounts',
    adminOnly: true,
  },
  {
    id: 'admin-institutions',
    href: '/admin/institutions',
    icon: 'globe',
    count: 0,
    labelKey: 'panel.adminInstitutions',
    adminOnly: true,
  },
  {
    id: 'admin-feed',
    href: '/admin/feed',
    icon: 'activity',
    count: 0,
    labelKey: 'panel.adminFeed',
    adminOnly: true,
  },
]

export const profileMenuDefs = [
  { id: 'profile', href: '/members/me', labelKey: 'profile.profile' },
  { id: 'account', href: '/members/me/profile', labelKey: 'profile.account' },
  { id: 'settings', href: '/members/me/settings', labelKey: 'profile.settings' },
  { id: 'admin-accounts', href: '/admin/accounts', labelKey: 'profile.adminAccounts', adminOnly: true },
  {
    id: 'admin-institutions',
    href: '/admin/institutions',
    labelKey: 'profile.adminInstitutions',
    adminOnly: true,
  },
  {
    id: 'admin-feed',
    href: '/admin/feed',
    labelKey: 'profile.adminFeed',
    adminOnly: true,
  },
  { id: 'logout', href: '/', labelKey: 'profile.logout' },
]

export const footerLinkDefs = [
  { id: 'about', href: '/legal/about', labelKey: 'footer.about' },
  { id: 'privacy', href: '/legal/privacy', labelKey: 'footer.privacy' },
  { id: 'terms', href: '/legal/terms', labelKey: 'footer.terms' },
  { id: 'contact', href: '/legal/contact', labelKey: 'footer.contact' },
]
