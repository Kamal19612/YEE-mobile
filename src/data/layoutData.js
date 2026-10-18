/** Layout navigation definitions — AfrEA-YEE app shell */

export const navItemDefs = [
  { id: 'stories', href: '/', labelKey: 'nav.stories' },
  { id: 'members', href: '/members', labelKey: 'nav.members' },
  { id: 'groups', href: '/groups', labelKey: 'nav.groups' },
  { id: 'institutions', href: '/institutions', labelKey: 'nav.institutions' },
  { id: 'events', href: '/events', labelKey: 'nav.events' },
  { id: 'resources', href: '/resources', labelKey: 'nav.resources' },
]

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
]

export const profileMenuDefs = [
  { id: 'profile', href: '/members/me', labelKey: 'profile.profile' },
  { id: 'account', href: '/members/me/profile', labelKey: 'profile.account' },
  { id: 'settings', href: '/members/me/settings', labelKey: 'profile.settings' },
  { id: 'admin-accounts', href: '/admin/accounts', labelKey: 'profile.adminAccounts', adminOnly: true },
  { id: 'logout', href: '/', labelKey: 'profile.logout' },
]

export const footerLinkDefs = [
  { id: 'about', href: '/legal/about', labelKey: 'footer.about' },
  { id: 'privacy', href: '/legal/privacy', labelKey: 'footer.privacy' },
  { id: 'terms', href: '/legal/terms', labelKey: 'footer.terms' },
  { id: 'contact', href: '/legal/contact', labelKey: 'footer.contact' },
]

/** @deprecated Use navItemDefs + i18n */
export const navItems = navItemDefs.map((item) => ({
  ...item,
  label: item.id === 'stories' ? 'Actualités' : item.id.charAt(0).toUpperCase() + item.id.slice(1),
}))

/** @deprecated Use panelItemDefs + i18n */
export const panelItems = panelItemDefs.map((item) => ({
  ...item,
  label: item.id,
}))

export const profileMenuItems = profileMenuDefs.map((item) => ({
  ...item,
  label: item.id,
}))

export const footerLinks = footerLinkDefs.map((item) => ({
  ...item,
  label: item.id,
}))
