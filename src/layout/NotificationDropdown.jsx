import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  canUseWebPushApis,
  platformAllowsPush,
  shouldShowIosInstallHint,
} from '../lib/pwaInstall'
import { enableWebPush, wasPushEnabledLocally } from '../lib/webPush'

export function NotificationDropdown() {
  const { t } = useTranslation()
  const { openDropdown, closeDropdowns } = useLayout()
  const { notifications, unreadCount, markRead, markAllRead, reload, loading, error } =
    useNotifications({ perPage: 8 })
  const open = openDropdown === 'notifications'
  const wasOpenRef = useRef(false)
  const preview = notifications.slice(0, 5)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushOn, setPushOn] = useState(() => wasPushEnabledLocally())
  const showPushCta =
    canUseWebPushApis() && !pushOn && (platformAllowsPush() || shouldShowIosInstallHint())

  const onEnablePush = useCallback(async () => {
    if (shouldShowIosInstallHint()) return
    setPushBusy(true)
    try {
      const result = await enableWebPush()
      if (result === 'subscribed') setPushOn(true)
    } finally {
      setPushBusy(false)
    }
  }, [])

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
      {showPushCta && (
        <div className="border-b border-bb-border bg-[rgba(0,102,163,0.06)] px-4 py-2.5">
          {shouldShowIosInstallHint() ? (
            <p className="m-0 text-bb-xs text-bb-text">{t('pwa.iosPushRequiresInstall')}</p>
          ) : (
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => onEnablePush().catch(() => {})}
              className="text-bb-sm font-medium text-bb-primary hover:underline disabled:opacity-60"
            >
              {pushBusy ? t('pwa.pushEnabling') : t('pwa.enablePush')}
            </button>
          )}
        </div>
      )}
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
