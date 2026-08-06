import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../components/ui/Avatar'
import { formatTimeSince } from '../features/activity/utils'
import {
  formatNotificationMessage,
  notificationHref,
} from '../features/notifications/utils'

export function UnreadNotifications({ items = [] }) {
  const { t } = useTranslation()

  if (!items.length) {
    return (
      <li className="bs-item-wrap list-none px-4 py-6 text-center text-bb-sm text-bb-muted">
        <div className="notification-content">{t('notifications.empty')}</div>
      </li>
    )
  }

  return items.map((n) => {
    const text = formatNotificationMessage(t, n)
    return (
      <li
        key={n.id}
        className={clsx(
          'read-item flex list-none items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0 hover:bg-bb-alt',
          n.unread && 'unread bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
        )}
      >
        <div className="notification-avatar">
          <Avatar name={n.actor?.displayName || text} src={n.actor?.avatarUrl} size="md" />
        </div>
        <div className="notification-content min-w-0 flex-1">
          <Link
            to={notificationHref(n)}
            className="block text-bb-sm text-bb-heading hover:text-bb-primary"
          >
            {text}
          </Link>
          <span className="posted text-bb-xs text-bb-muted">
            {formatTimeSince(n.createdAt || n.time)}
          </span>
        </div>
      </li>
    )
  })
}
