/** Icônes UI (équivalent bb-icons du thème) + wrappers SVG BuddyBoss */

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconSidebar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  )
}

export function IconBars(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  )
}

export function IconInbox(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8l8 5 8-5" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  )
}

export function IconBell(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconAngleDown(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function IconAngleRight(props) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function IconAngleLeft(props) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconHome(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  )
}

export function IconActivity(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h4l2-6 4 12 2-6h4" />
    </svg>
  )
}

export function IconUsers(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5S14 16 14.5 19" />
      <path d="M15 14.5c2 .2 3.5 1.4 4.2 4.5" />
    </svg>
  )
}

export function IconGroup(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="9" r="2.5" />
      <circle cx="16" cy="9" r="2.5" />
      <circle cx="12" cy="14" r="2.5" />
      <path d="M3.5 18c.6-2.2 2-3.3 4.5-3.3" />
      <path d="M20.5 18c-.6-2.2-2-3.3-4.5-3.3" />
    </svg>
  )
}

export function IconForum(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 6h14v9H9l-4 3v-3H5V6z" />
    </svg>
  )
}

export function IconEllipsis(props) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconLike({ filled, ...props }) {
  return (
    <svg {...base} {...props}>
      <path
        d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7zm0 0l3.2-6.2A2 2 0 0 1 12 3.8c1.1 0 1.9.9 1.8 2l-.3 3.2H19a2 2 0 0 1 1.9 2.5l-1.2 5A2 2 0 0 1 17.8 20H7"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

export function IconComment(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 6h14v9H9l-4 3v-3H5V6z" />
    </svg>
  )
}

export function IconShare(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.3 13.2l7.4 4.2M15.7 6.6l-7.4 4.2" />
    </svg>
  )
}

export function IconImage(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M3 16l5-4 4 3 4-5 5 6" />
    </svg>
  )
}

export function IconPoll(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 20V10M12 20V4M18 20v-7" />
    </svg>
  )
}

export function IconGlobe(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" />
    </svg>
  )
}

export function IconUsersLock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5" />
      <rect x="14" y="12" width="7" height="6" rx="1" />
      <path d="M16 12V10.5a1.5 1.5 0 0 1 3 0V12" />
    </svg>
  )
}

export function IconCart(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.2 11h11.3l1.5-7H7" />
    </svg>
  )
}

export function IconBook(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M18 3v16" />
    </svg>
  )
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

export function IconBriefcase(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    </svg>
  )
}

export function IconBadge(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="10" r="6" />
      <path d="M8.5 15.5L7 21l5-2 5 2-1.5-5.5" />
    </svg>
  )
}
