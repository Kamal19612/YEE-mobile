/** Données de démo pour la Phase 1 (layout + dropdowns) */

export const currentUser = {
  id: 1,
  displayName: 'Alex Martin',
  mentionName: 'alex',
  avatar: null,
}

export const navItems = [
  { id: 'activity', label: 'Activity', href: '/' },
  { id: 'members', label: 'Members', href: '/members' },
  { id: 'groups', label: 'Groups', href: '/groups' },
  { id: 'forums', label: 'Forums', href: '/forums' },
  { id: 'courses', label: 'Courses', href: '/courses' },
  { id: 'shop', label: 'Shop', href: '/shop' },
]

export const panelItems = [
  { id: 'news', label: 'News Feed', href: '/', icon: 'activity', count: 0 },
  { id: 'members', label: 'Members', href: '/members', icon: 'users', count: 0 },
  { id: 'groups', label: 'Groups', href: '/groups', icon: 'group', count: 3 },
  { id: 'forums', label: 'Forums', href: '/forums', icon: 'forum', count: 0 },
  { id: 'courses', label: 'Courses', href: '/courses', icon: 'book', count: 0 },
  { id: 'events', label: 'Events', href: '/events', icon: 'calendar', count: 0 },
  { id: 'jobs', label: 'Jobs', href: '/jobs', icon: 'briefcase', count: 0 },
  { id: 'shop', label: 'Shop', href: '/shop', icon: 'cart', count: 0 },
  { id: 'memberships', label: 'Memberships', href: '/memberships', icon: 'badge', count: 0 },
  { id: 'messages', label: 'Messages', href: '/messages', icon: 'inbox', count: 2 },
  { id: 'notifications', label: 'Notifications', href: '/notifications', icon: 'bell', count: 5 },
]

export const profileMenuItems = [
  { id: 'profile', label: 'Profile', href: '/members/1' },
  { id: 'account', label: 'Account', href: '/members/1/profile' },
  { id: 'settings', label: 'Settings', href: '/members/1/settings' },
  { id: 'logout', label: 'Log Out', href: '/' },
]

export const unreadMessages = [
  {
    id: 11,
    name: 'Sophie Durand',
    excerpt: 'Hey, are we still on for the meetup tomorrow?',
    time: '12 min',
    unread: true,
  },
  {
    id: 12,
    name: 'Design Crew',
    excerpt: 'New mockups uploaded in the shared folder.',
    time: '1 h',
    unread: true,
  },
  {
    id: 13,
    name: 'Julien Petit',
    excerpt: 'Thanks for the feedback on the proposal!',
    time: 'Yesterday',
    unread: false,
  },
]

export const unreadNotifications = [
  {
    id: 21,
    text: 'Sophie Durand liked your update',
    time: '5 minutes ago',
    unread: true,
  },
  {
    id: 22,
    text: 'You were mentioned in Design Crew',
    time: '40 minutes ago',
    unread: true,
  },
  {
    id: 23,
    text: 'Julien Petit sent you a friend request',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 24,
    text: 'New reply in “Welcome to the community”',
    time: 'Yesterday',
    unread: false,
  },
]

export const footerLinks = [
  { id: 'about', label: 'About', href: '#' },
  { id: 'privacy', label: 'Privacy', href: '#' },
  { id: 'terms', label: 'Terms', href: '#' },
  { id: 'contact', label: 'Contact', href: '#' },
]
