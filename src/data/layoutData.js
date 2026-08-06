/** Layout navigation definitions — AfrEA-YEE app shell */

export const navItemDefs = [
  { id: 'stories', href: '/', labelKey: 'nav.stories' },
  { id: 'members', href: '/members', labelKey: 'nav.members' },
  { id: 'groups', href: '/groups', labelKey: 'nav.groups' },
  { id: 'institutions', href: '/institutions', labelKey: 'nav.institutions' },
  { id: 'forums', href: '/forums', labelKey: 'nav.forums' },
  { id: 'resources', href: '/resources', labelKey: 'nav.resources' },
]

export const panelItemDefs = [
  { id: 'stories', href: '/', icon: 'activity', count: 0, labelKey: 'panel.stories' },
  { id: 'members', href: '/members', icon: 'users', count: 0, labelKey: 'panel.members' },
  { id: 'groups', href: '/groups', icon: 'group', count: 0, labelKey: 'panel.groups' },
  { id: 'institutions', href: '/institutions', icon: 'globe', count: 0, labelKey: 'panel.institutions' },
  { id: 'forums', href: '/forums', icon: 'forum', count: 0, labelKey: 'panel.forums' },
  { id: 'resources', href: '/resources', icon: 'book', count: 0, labelKey: 'panel.resources' },
  { id: 'messages', href: '/messages', icon: 'inbox', count: 0, labelKey: 'panel.messages' },
  { id: 'notifications', href: '/notifications', icon: 'bell', count: 0, labelKey: 'panel.notifications' },
  { id: 'moderation', href: '/moderation', icon: 'shield', count: 0, labelKey: 'panel.moderation' },
]

export const profileMenuDefs = [
  { id: 'profile', href: '/members/me', labelKey: 'profile.profile' },
  { id: 'account', href: '/members/me/profile', labelKey: 'profile.account' },
  { id: 'settings', href: '/members/me/settings', labelKey: 'profile.settings' },
  { id: 'logout', href: '/', labelKey: 'profile.logout' },
]

export const footerLinkDefs = [
  { id: 'about', href: '#', labelKey: 'footer.about' },
  { id: 'privacy', href: '#', labelKey: 'footer.privacy' },
  { id: 'terms', href: '#', labelKey: 'footer.terms' },
  { id: 'contact', href: '#', labelKey: 'footer.contact' },
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
