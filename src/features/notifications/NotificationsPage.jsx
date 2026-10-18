import { Link } from 'react-router-dom'
import { useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { PushEnableCard } from '../../components/ui/PushEnableCard'
import { useNotifications } from '../../hooks/useNotifications'
import { formatTimeSince } from '../activity/utils'
import { formatNotificationMessage, notificationHref } from './utils'

/** Page notifications — liste App API + i18n par type. */
export function NotificationsPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    markRead,
    markAllRead,
    unreadCount,
    total,
  } = useNotifications({ filter })

  const filters = [
    { id: 'all', labelKey: 'notifications.filters.all' },
    { id: 'unread', labelKey: 'notifications.filters.unread' },
    { id: 'read', labelKey: 'notifications.filters.read' },
  ]

  return (
    <div className="w-full max-w-content">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('notifications.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">
            {t('notifications.subtitle', { unread: unreadCount, total })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => markAllRead().catch(() => {})}
          disabled={!unreadCount}
        >
          {t('notifications.markAllRead')}
        </Button>
      </header>

      <PushEnableCard />

      <div className="mb-4 flex gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={clsx(
              'rounded-bb-inner px-3 py-1.5 text-bb-sm font-medium',
              filter === f.id ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text',
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="bb-card overflow-hidden">
        {loading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-bb-inner bg-bb-alt" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-4 text-bb-sm text-bb-danger">{error}</div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="p-8 text-center text-bb-sm text-bb-muted">{t('notifications.empty')}</div>
        )}

        {!loading && !error && (
          <ul className="notification-list bb-nouveau-list m-0 list-none p-0">
            {notifications.map((n) => {
              const text = formatNotificationMessage(t, n)
              const href = notificationHref(n)
              return (
                <li
                  key={n.id}
                  className={clsx(
                    'read-item flex items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0',
                    n.unread && 'unread bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
                  )}
                >
                  <Avatar
                    name={n.actor?.displayName || text}
                    src={n.actor?.avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={href}
                      onClick={() => {
                        if (n.unread) markRead(n.id).catch(() => {})
                      }}
                      className="block text-bb-sm text-bb-heading hover:text-bb-primary"
                    >
                      {text}
                    </Link>
                    <div className="mt-0.5 text-bb-xs text-bb-muted">
                      {formatTimeSince(n.createdAt)}
                    </div>
                  </div>
                  {n.unread && (
                    <button
                      type="button"
                      className="text-bb-xs font-medium text-bb-primary hover:underline"
                      onClick={() => markRead(n.id).catch(() => {})}
                    >
                      {t('notifications.markRead')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!loading && hasMore && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={loadMore}>
            {t('common.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
