import { Avatar } from '../components/ui/Avatar'
import { unreadMessages } from '../data/demoData'
import clsx from 'clsx'

export function UnreadMessages({ items = unreadMessages }) {
  if (!items.length) {
    return (
      <li className="bs-item-wrap list-none px-4 py-6 text-center text-bb-sm text-bb-muted">
        <div className="notification-content">You have no messages right now.</div>
      </li>
    )
  }

  return items.map((msg) => (
    <li
      key={msg.id}
      className={clsx(
        'read-item flex list-none items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0 hover:bg-bb-alt',
        msg.unread && 'unread bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
      )}
    >
      <Avatar name={msg.name} size="md" />
      <div className="notification-content min-w-0 flex-1">
        <div className="truncate text-bb-sm font-semibold text-bb-heading">{msg.name}</div>
        <div className="truncate text-bb-sm text-bb-text">{msg.excerpt}</div>
        <div className="posted mt-0.5 text-bb-xs text-bb-muted">{msg.time}</div>
      </div>
    </li>
  ))
}
