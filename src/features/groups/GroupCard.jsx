import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { formatTimeSince } from '../activity/utils'

export function GroupCard({ group, view = 'grid', onToggleMembership }) {
  const statusLabel =
    group.status === 'public' ? 'Public' : group.status === 'private' ? 'Private' : 'Hidden'

  if (view === 'list') {
    return (
      <li className="flex list-none items-center gap-4 rounded-bb border border-bb-border bg-bb-content p-4">
        <Link to={`/groups/${group.id}`}>
          <Avatar name={group.name} src={group.avatar} size="xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/groups/${group.id}`} className="text-bb-lg font-medium text-bb-heading hover:text-bb-primary">
            {group.name}
          </Link>
          <p className="m-0 mt-1 line-clamp-2 text-bb-sm text-bb-text">{group.description}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-bb-xs text-bb-muted">
            <span>{statusLabel}</span>
            <span>{group.membersCount} members</span>
            <span>Active {formatTimeSince(group.lastActive)}</span>
          </div>
        </div>
        <MembershipButton group={group} onToggle={onToggleMembership} />
      </li>
    )
  }

  return (
    <li className="list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-card">
      <div
        className="h-24 bg-cover bg-center"
        style={
          group.cover
            ? { backgroundImage: `url(${group.cover})` }
            : { backgroundColor: 'var(--bb-cover-image-background-color)' }
        }
      />
      <div className="-mt-8 px-4 pb-4 text-center">
        <Link to={`/groups/${group.id}`} className="inline-block">
          <Avatar name={group.name} src={group.avatar} size="xl" className="ring-4 ring-bb-content" />
        </Link>
        <div className="mt-2">
          <Link to={`/groups/${group.id}`} className="text-bb-md font-medium text-bb-heading hover:text-bb-primary">
            {group.name}
          </Link>
        </div>
        <div className="mt-1 text-bb-xs text-bb-muted">
          {statusLabel} · {group.membersCount} members
        </div>
        <p className="m-0 mt-2 line-clamp-2 text-bb-sm text-bb-text">{group.description}</p>
        <div className="mt-4">
          <MembershipButton group={group} onToggle={onToggleMembership} />
        </div>
      </div>
    </li>
  )
}

function MembershipButton({ group, onToggle }) {
  if (group.isMember) {
    return (
      <div className="flex justify-center gap-2">
        <Button as={Link} to={`/groups/${group.id}`} size="sm" variant="outline">
          Visit
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => onToggle?.(group.id)}>
          Leave
        </Button>
      </div>
    )
  }
  return (
    <Button type="button" size="sm" onClick={() => onToggle?.(group.id)}>
      {group.status === 'private' ? 'Request Join' : 'Join Group'}
    </Button>
  )
}
