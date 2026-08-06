import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { IconAngleRight, IconBell } from '../components/icons'
import { Badge } from '../components/ui/Badge'
import { Dropdown, DropdownFooter, DropdownHeader } from '../components/ui/Dropdown'
import { Avatar } from '../components/ui/Avatar'
import { useLayout } from '../context/LayoutProvider'
import { useNotifications } from '../hooks/useNotifications'
import { formatTimeSince } from '../features/activity/utils'
import {
  formatNotificationMessage,
  notificationHref,
} from '../features/notifications/utils'

export function NotificationDropdown() {
  const { t } = useTranslation()
  const { openDropdown, closeDropdowns } = useLayout()
  const { notifications, unreadCount, markRead, markAllRead, reload, loading, error } =
    useNotifications({ perPage: 8 })
  const open = openDropdown === 'notifications'
  const wasOpenRef = useRef(false)
  const preview = notifications.slice(0, 5)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      reload().catch(() => {})
    }
    wasOpenRef.current = open
  }, [open, reload])

  return (
    <Dropdown
      id="notifications"
      trigger={
        <span
          data-balloon-pos="down"
          data-balloon={t('notifications.title')}
          className="relative inline-flex"
        >
          <IconBell />
          <Badge count={unreadCount} />
          <span className="screen-reader-text">{t('notifications.title')}</span>
        </span>
      }
    >
      <DropdownHeader
        title={t('notifications.title')}
        action={
          unreadCount > 0 ? (
            <button
              type="button"
              className="mark-read-all text-bb-sm text-bb-primary hover:underline"
              onClick={() => markAllRead().catch(() => {})}
            >
              {t('notifications.markAllRead')}
            </button>
          ) : null
        }
      />
      <ul className="notification-list bb-nouveau-list m-0 max-h-[360px] list-none overflow-y-auto p-0">
        {loading && preview.length === 0 && (
          <li className="list-none px-4 py-6 text-center text-bb-sm text-bb-muted">
            {t('common.loading')}
          </li>
        )}
        {!loading && error && (
          <li className="list-none px-4 py-4 text-center text-bb-sm text-bb-danger">{error}</li>
        )}
        {!loading && !error && preview.length === 0 && (
          <li className="list-none px-4 py-6 text-center text-bb-sm text-bb-muted">
            {t('notifications.empty')}
          </li>
        )}
        {preview.map((n) => {
          const text = formatNotificationMessage(t, n)
          const href = notificationHref(n)
          const avatarName = n.actor?.displayName || text
          return (
            <li key={n.id} className="list-none border-b border-bb-border last:border-b-0">
              <Link
                to={href}
                onClick={() => {
                  if (n.unread) markRead(n.id).catch(() => {})
                  closeDropdowns()
                }}
                className={clsx(
                  'flex items-start gap-3 px-4 py-3 hover:bg-bb-alt',
                  n.unread && 'bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
                )}
              >
                <Avatar name={avatarName} src={n.actor?.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-bb-sm text-bb-heading">{text}</div>
                  <div className="text-bb-xs text-bb-muted">
                    {formatTimeSince(n.createdAt)}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      <DropdownFooter href="/notifications" onClick={closeDropdowns}>
        {t('notifications.viewAll')}
        <IconAngleRight />
      </DropdownFooter>
    </Dropdown>
  )
}
