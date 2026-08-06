import clsx from 'clsx'
import { Avatar } from '../components/ui/Avatar'

export function UnreadNotifications({ items = [] }) {
  if (!items.length) {
    return (
      <li className="bs-item-wrap list-none px-4 py-6 text-center text-bb-sm text-bb-muted">
        <div className="notification-content">You have no notifications right now.</div>
      </li>
    )
  }

  return items.map((n) => (
    <li
      key={n.id}
      className={clsx(
        'read-item flex list-none items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0 hover:bg-bb-alt',
        n.unread && 'unread bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
      )}
    >
      <div className="notification-avatar">
        <Avatar name={n.text} size="md" />
      </div>
      <div className="notification-content min-w-0 flex-1">
        <span className="block text-bb-sm text-bb-heading">{n.text}</span>
        <span className="posted text-bb-xs text-bb-muted">{n.time}</span>
      </div>
    </li>
  ))
}
