import { Link } from 'react-router-dom'
import { IconAngleRight, IconInbox } from '../components/icons'
import { Badge } from '../components/ui/Badge'
import { Dropdown, DropdownFooter, DropdownHeader } from '../components/ui/Dropdown'
import { useLayout } from '../context/LayoutProvider'
import { threadPreview, demoThreads } from '../data/messagesData'
import { Avatar } from '../components/ui/Avatar'
import { formatTimeSince } from '../features/activity/utils'
import clsx from 'clsx'

export function MessagesDropdown() {
  const { closeDropdowns } = useLayout()
  const items = demoThreads.map(threadPreview)
  const unread = items.filter((m) => m.unread).length

  return (
    <Dropdown
      id="messages"
      trigger={
        <span data-balloon-pos="down" data-balloon="Messages" className="relative inline-flex">
          <IconInbox />
          <Badge count={unread} />
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
                <div className="truncate text-bb-sm font-semibold text-bb-heading">{msg.name}</div>
                <div className="truncate text-bb-sm text-bb-text">{msg.excerpt}</div>
                <div className="mt-0.5 text-bb-xs text-bb-muted">{formatTimeSince(msg.time)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <DropdownFooter href="/messages" onClick={closeDropdowns}>
        View Inbox
        <IconAngleRight />
      </DropdownFooter>
    </Dropdown>
  )
}
