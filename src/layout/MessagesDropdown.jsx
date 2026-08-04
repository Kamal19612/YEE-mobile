import { Link } from 'react-router-dom'
import { IconAngleRight, IconInbox } from '../components/icons'
import { Badge } from '../components/ui/Badge'
import { Dropdown, DropdownFooter, DropdownHeader } from '../components/ui/Dropdown'
import { useLayout } from '../context/LayoutProvider'
import { useMessages } from '../hooks/useMessages'
import { threadPreview } from '../data/messagesData'
import { Avatar } from '../components/ui/Avatar'
import { formatTimeSince } from '../features/activity/utils'
import clsx from 'clsx'

export function MessagesDropdown() {
  const { closeDropdowns } = useLayout()
  const { threads, unreadCount } = useMessages()
  const items = threads.slice(0, 5).map(threadPreview)

  return (
    <Dropdown
      id="messages"
      trigger={
        <span data-balloon-pos="down" data-balloon="Messages" className="relative inline-flex">
          <IconInbox />
          <Badge count={unreadCount} />
          <span className="screen-reader-text">Messages</span>
        </span>
      }
    >
      <DropdownHeader title="Messages" />
      <ul className="notification-list m-0 max-h-[360px] list-none overflow-y-auto p-0">
        {items.map((msg) => (
          <li key={msg.id} className="list-none border-b border-bb-border last:border-b-0">
            <Link
              to={`/messages/${msg.id}`}
              onClick={closeDropdowns}
              className={clsx(
                'flex items-start gap-3 px-4 py-3 hover:bg-bb-alt',
                msg.unread && 'bg-[rgba(var(--bb-primary-color-rgb),0.03)]',
              )}
            >
              <Avatar name={msg.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-bb-sm font-medium text-bb-heading">{msg.name}</div>
                <div className="truncate text-bb-xs text-bb-muted">{msg.excerpt}</div>
                <div className="text-bb-xs text-bb-muted">{formatTimeSince(msg.time)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <DropdownFooter href="/messages" onClick={closeDropdowns}>
        View Messages
        <IconAngleRight />
      </DropdownFooter>
    </Dropdown>
  )
}
