import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useNotifications } from '../../hooks/useNotifications'
import { formatTimeSince } from '../activity/utils'
import { formatNotificationMessage, notificationHref } from '../notifications/utils'

/** Référence: members/single/notifications.php */
export function ProfileNotifications() {
  const { t } = useTranslation()
  const { notifications, loading, error, markAllRead, markRead } = useNotifications()

  return (
    <div className="bb-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-bb-border px-4 py-3">
        <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{t('notifications.title')}</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => markAllRead().catch(() => {})}
        >
          {t('notifications.markAllRead')}
        </Button>
      </header>
      {loading && (
        <div className="px-4 py-6 text-center text-bb-sm text-bb-muted">{t('common.loading')}</div>
      )}
      {!loading && error && (
        <div className="px-4 py-4 text-bb-sm text-bb-danger">{error}</div>
      )}
      {!loading && !error && notifications.length === 0 && (
        <div className="px-4 py-6 text-center text-bb-sm text-bb-muted">{t('notifications.empty')}</div>
      )}
      <ul className="m-0 list-none p-0">
        {notifications.map((n) => {
          const text = formatNotificationMessage(t, n)
          return (
            <li
              key={n.id}
              className={`flex items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0 ${
                n.unread ? 'bg-[rgba(var(--bb-primary-color-rgb),0.03)]' : ''
              }`}
            >
              <Avatar name={n.actor?.displayName || text} src={n.actor?.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <Link
                  to={notificationHref(n)}
                  onClick={() => {
                    if (n.unread) markRead(n.id).catch(() => {})
                  }}
                  className="text-bb-sm text-bb-heading hover:text-bb-primary"
                >
                  {text}
                </Link>
                <div className="text-bb-xs text-bb-muted">{formatTimeSince(n.createdAt)}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
