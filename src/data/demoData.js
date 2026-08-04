/** Données de démo — périmètre AfrEA-YEE (prompt reconstruction TDR juillet 2026) */

export const currentUser = {
  id: 1,
  displayName: 'Amina Okonkwo',
  mentionName: 'amina',
  avatar: null,
  country: 'Nigeria',
  region: 'West Africa',
  language: 'en',
  thematic: 'Gender & Equity',
  role: 'yee',
}

/** Navigation principale — modules TDR uniquement */
export const navItemDefs = [
  { id: 'stories', href: '/', labelKey: 'nav.stories' },
  { id: 'members', href: '/members', labelKey: 'nav.members' },
  { id: 'groups', href: '/groups', labelKey: 'nav.groups' },
  { id: 'forums', href: '/forums', labelKey: 'nav.forums' },
  { id: 'resources', href: '/resources', labelKey: 'nav.resources' },
]

/** BuddyPanel — hors shop / courses / events / jobs / memberships */
export const panelItemDefs = [
  { id: 'stories', href: '/', icon: 'activity', count: 0, labelKey: 'panel.stories' },
  { id: 'members', href: '/members', icon: 'users', count: 0, labelKey: 'panel.members' },
  { id: 'groups', href: '/groups', icon: 'group', count: 3, labelKey: 'panel.groups' },
  { id: 'forums', href: '/forums', icon: 'forum', count: 0, labelKey: 'panel.forums' },
  { id: 'resources', href: '/resources', icon: 'book', count: 0, labelKey: 'panel.resources' },
  { id: 'messages', href: '/messages', icon: 'inbox', count: 2, labelKey: 'panel.messages' },
  { id: 'notifications', href: '/notifications', icon: 'bell', count: 5, labelKey: 'panel.notifications' },
  { id: 'moderation', href: '/moderation', icon: 'shield', count: 2, labelKey: 'panel.moderation' },
]

export const profileMenuDefs = [
  { id: 'profile', href: '/members/1', labelKey: 'profile.profile' },
  { id: 'account', href: '/members/1/profile', labelKey: 'profile.account' },
  { id: 'settings', href: '/members/1/settings', labelKey: 'profile.settings' },
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
  label: item.id === 'stories' ? 'Récits' : item.id.charAt(0).toUpperCase() + item.id.slice(1),
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

export const unreadMessages = [
  {
    id: 11,
    name: 'Fatou Diallo',
    excerpt: 'Merci pour ton récit sur l’évaluation participative.',
    time: '12 min',
    unread: true,
  },
  {
    id: 12,
    name: 'Cohorte Afrique de l’Ouest',
    excerpt: 'Nouveau guide de narration disponible dans Ressources.',
    time: '1 h',
    unread: true,
  },
  {
    id: 13,
    name: 'Jean-Baptiste Nkomo',
    excerpt: 'Peux-tu relire mon brouillon avant soumission ?',
    time: 'Hier',
    unread: false,
  },
]

export const unreadNotifications = [
  {
    id: 21,
    text: 'Fatou Diallo a réagi à votre récit',
    time: 'Il y a 5 minutes',
    unread: true,
  },
  {
    id: 22,
    text: 'Votre récit est en attente de modération',
    time: 'Il y a 40 minutes',
    unread: true,
  },
  {
    id: 23,
    text: 'Invitation à rejoindre la cohorte Afrique centrale',
    time: 'Il y a 2 heures',
    unread: true,
  },
  {
    id: 24,
    text: 'Nouvelle réponse dans « Méthodes mixtes »',
    time: 'Hier',
    unread: false,
  },
]
