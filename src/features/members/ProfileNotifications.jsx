import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useNotifications } from '../../hooks/useNotifications'

/** Référence: members/single/notifications.php */
export function ProfileNotifications() {
  const { notifications, loading, error, markAllRead } = useNotifications()

  return (
    <div className="bb-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-bb-border px-4 py-3">
        <h2 className="m-0 text-bb-md font-semibold text-bb-heading">Notifications</h2>
        <Button type="button" size="sm" variant="outline" onClick={markAllRead}>
          Mark all as read
        </Button>
      </header>
      {loading && (
        <div className="px-4 py-6 text-center text-bb-sm text-bb-muted">Loading…</div>
      )}
      {!loading && error && (
        <div className="px-4 py-4 text-bb-sm text-bb-danger">{error}</div>
      )}
      {!loading && !error && notifications.length === 0 && (
        <div className="px-4 py-6 text-center text-bb-sm text-bb-muted">
          You have no notifications right now.
        </div>
      )}
      <ul className="m-0 list-none p-0">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`flex items-start gap-3 border-b border-bb-border px-4 py-3 last:border-b-0 ${
              n.unread ? 'bg-[rgba(var(--bb-primary-color-rgb),0.03)]' : ''
            }`}
          >
            <Avatar name={n.text} size="md" />
            <div className="min-w-0 flex-1">
              <div className="text-bb-sm text-bb-heading">{n.text}</div>
              <div className="text-bb-xs text-bb-muted">{n.time}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
