import { Link } from 'react-router-dom'
import { IconAngleRight, IconBell } from '../components/icons'
import { Badge } from '../components/ui/Badge'
import { Dropdown, DropdownFooter, DropdownHeader } from '../components/ui/Dropdown'
import { useLayout } from '../context/LayoutProvider'
import { demoNotifications } from '../data/notificationsData'
import { Avatar } from '../components/ui/Avatar'
import { formatTimeSince } from '../features/activity/utils'
import clsx from 'clsx'
import { useMemo, useState } from 'react'

export function NotificationDropdown() {
  const { closeDropdowns } = useLayout()
  const [items, setItems] = useState(demoNotifications)
  const unread = useMemo(() => items.filter((n) => n.unread).length, [items])
  const preview = items.slice(0, 5)

  return (
    <Dropdown
      id="notifications"
      trigger={
        <span data-balloon-pos="down" data-balloon="Notifications" className="relative inline-flex">
          <IconBell />
          <Badge count={unread} />
          <span className="screen-reader-text">Notifications</span>
        </span>
      }
    >
      <DropdownHeader
        title="Notifications"
        action={
          unread > 0 ? (
            <button
              type="button"
              className="mark-read-all text-bb-sm text-bb-primary hover:underline"
              onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}
            >
              Mark all as read
            </button>
          ) : null
        }
      />
      <ul className="notification-list bb-nouveau-list m-0 max-h-[360px] list-none overflow-y-auto p-0">
        {preview.map((n) => (
          <li key={n.id} className="list-none border-b border-bb-border last:border-b-0">
            <Link
              to={n.href}
              onClick={() => {
                setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
                closeDropdowns()
              }}
              className={clsx(
                'flex items-start gap-3 px-4 py-3 hover:bg-bb-alt',
                n.unread && 'bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
              )}
            >
              <Avatar name={n.text} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-bb-sm text-bb-heading">{n.text}</div>
                <div className="text-bb-xs text-bb-muted">{formatTimeSince(n.time)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <DropdownFooter href="/notifications" onClick={closeDropdowns}>
        View Notifications
        <IconAngleRight />
      </DropdownFooter>
    </Dropdown>
  )
}
