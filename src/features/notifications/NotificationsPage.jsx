import { Link } from 'react-router-dom'
import { useState } from 'react'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useNotifications } from '../../hooks/useNotifications'
import { formatTimeSince } from '../activity/utils'

/** Page notifications — pattern du dropdown en liste paginée */
export function NotificationsPage() {
  const [filter, setFilter] = useState('all')
  const {
    notifications,
    loading,
    hasMore,
    loadMore,
    markRead,
    markAllRead,
    unreadCount,
    total,
  } = useNotifications({ filter })

  return (
    <div className="w-full max-w-content">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Notifications</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">
            {unreadCount} unread · {total} shown with current filter
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={markAllRead} disabled={!unreadCount}>
          Mark all as read
        </Button>
      </header>

      <div className="mb-4 flex gap-1">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread' },
          { id: 'read', label: 'Read' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={clsx(
              'rounded-bb-inner px-3 py-1.5 text-bb-sm font-medium',
              filter === f.id ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text',
            )}
          >
            {f.label}
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

        {!loading && notifications.length === 0 && (
          <div className="p-8 text-center text-bb-sm text-bb-muted">
            You have no notifications right now.
          </div>
        )}

        {!loading && (
          <ul className="notification-list bb-nouveau-list m-0 list-none p-0">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={clsx(
                  'read-item flex items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0',
                  n.unread && 'unread bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
                )}
              >
                <Avatar name={n.text} size="md" />
                <div className="min-w-0 flex-1">
                  <Link
                    to={n.href}
                    onClick={() => markRead(n.id)}
                    className="block text-bb-sm text-bb-heading hover:text-bb-primary"
                  >
                    {n.text}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-bb-xs text-bb-muted">
                    <span>{formatTimeSince(n.time)}</span>
                    <span className="rounded-bb-option bg-bb-alt px-1.5 py-0.5 capitalize">
                      {n.component}
                    </span>
                  </div>
                </div>
                {n.unread && (
                  <button
                    type="button"
                    className="text-bb-xs font-medium text-bb-primary hover:underline"
                    onClick={() => markRead(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && hasMore && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
