import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconAngleRight, IconInbox } from '../components/icons'
import { Badge } from '../components/ui/Badge'
import { Dropdown, DropdownFooter, DropdownHeader } from '../components/ui/Dropdown'
import { useLayout } from '../context/LayoutProvider'
import { useMessageUnreadCount, useMessages } from '../hooks/useMessages'
import { threadPreview } from '../data/messagesData'
import { Avatar } from '../components/ui/Avatar'
import { formatTimeSince } from '../features/activity/utils'
import clsx from 'clsx'

export function MessagesDropdown() {
  const { t } = useTranslation()
  const { closeDropdowns } = useLayout()
  const { threads } = useMessages()
  const unreadCount = useMessageUnreadCount()
  const items = threads.slice(0, 5).map((thread) => {
    const preview = threadPreview({
      ...thread,
      messages: thread.lastMessage ? [thread.lastMessage] : thread.messages || [],
    })
    return {
      ...preview,
      name: thread.isGroup ? thread.subject || preview.name : preview.name,
      avatar: thread.participants?.[0]?.avatar,
      unread: thread.unread,
    }
  })

  return (
    <Dropdown
      id="messages"
      trigger={
        <span data-balloon-pos="down" data-balloon={t('messages.title')} className="relative inline-flex">
          <IconInbox />
          <Badge count={unreadCount} />
          <span className="screen-reader-text">{t('messages.title')}</span>
        </span>
      }
    >
      <DropdownHeader title={t('messages.title')} />
      <ul className="notification-list m-0 max-h-[360px] list-none overflow-y-auto p-0">
        {!items.length && (
          <li className="list-none px-4 py-6 text-center text-bb-sm text-bb-muted">{t('messages.empty')}</li>
        )}
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
              <Avatar name={msg.name} src={msg.avatar} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-bb-sm font-medium text-bb-heading">{msg.name}</div>
                  <div className="shrink-0 text-[11px] text-bb-muted">{formatTimeSince(msg.time)}</div>
                </div>
                <div
                  className={clsx(
                    'truncate text-bb-xs',
                    msg.unread ? 'font-medium text-bb-heading' : 'text-bb-muted',
                  )}
                >
                  {msg.excerpt}
                </div>
              </div>
              {msg.unread ? (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-bb-primary" aria-hidden />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      <DropdownFooter href="/messages" onClick={closeDropdowns}>
        {t('messages.viewAll')}
        <IconAngleRight />
      </DropdownFooter>
    </Dropdown>
  )
}
