import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { formatTimeSince } from '../activity/utils'

export function MemberCard({ member, view = 'grid', onFriendToggle }) {
  if (view === 'list') {
    return (
      <li className="bs-item-wrap flex list-none items-center gap-4 rounded-bb border border-bb-border bg-bb-content p-4">
        <Link to={`/members/${member.id}`} className="relative shrink-0">
          <Avatar name={member.displayName} src={member.avatar} size="xl" />
          {member.online && <OnlineDot />}
        </Link>
        <div className="item min-w-0 flex-1">
          <div className="item-title">
            <Link to={`/members/${member.id}`} className="text-bb-lg font-medium text-bb-heading hover:text-bb-primary">
              {member.displayName}
            </Link>
          </div>
          <div className="item-meta text-bb-sm text-bb-muted">@{member.mentionName}</div>
          {member.location && <div className="location mt-1 text-bb-sm text-bb-text">{member.location}</div>}
          <div className="mt-1 text-bb-xs text-bb-muted">Active {formatTimeSince(member.lastActive)}</div>
        </div>
        <div className="action shrink-0">
          <FriendButton member={member} onFriendToggle={onFriendToggle} />
        </div>
      </li>
    )
  }

  return (
    <li className="bs-item-wrap list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content text-center shadow-card">
      <div
        className="h-20 bg-bb-cover bg-cover bg-center"
        style={
          member.cover
            ? { backgroundImage: `url(${member.cover})` }
            : { backgroundColor: 'var(--bb-cover-image-background-color)' }
        }
      />
      <div className="-mt-10 px-4 pb-4">
        <Link to={`/members/${member.id}`} className="relative mx-auto inline-block">
          <Avatar
            name={member.displayName}
            src={member.avatar}
            size="xl"
            className="ring-4 ring-bb-content"
          />
          {member.online && <OnlineDot />}
        </Link>
        <div className="item-title mt-2">
          <Link
            to={`/members/${member.id}`}
            className="text-[1.125rem] font-medium text-bb-heading hover:text-bb-primary"
          >
            {member.displayName}
          </Link>
        </div>
        <div className="text-bb-sm text-bb-muted">@{member.mentionName}</div>
        {member.memberType && (
          <span className="mt-2 inline-block rounded-bb-option bg-bb-label px-2 py-0.5 text-bb-xs font-medium text-bb-label-text">
            {member.memberType}
          </span>
        )}
        <div className="mt-3 flex justify-center gap-4 text-bb-xs text-bb-muted">
          <span>
            <strong className="text-bb-heading">{member.stats.friends}</strong> friends
          </span>
          <span>
            <strong className="text-bb-heading">{member.stats.groups}</strong> groups
          </span>
        </div>
        <div className="action mt-4">
          <FriendButton member={member} onFriendToggle={onFriendToggle} />
        </div>
      </div>
    </li>
  )
}

function OnlineDot() {
  return (
    <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-bb-content bg-bb-success" />
  )
}

function FriendButton({ member, onFriendToggle }) {
  if (member.friendshipStatus === 'self') {
    return (
      <Button as={Link} to={`/members/${member.id}`} variant="outline" size="sm">
        View Profile
      </Button>
    )
  }

  const label =
    member.friendshipStatus === 'is_friend'
      ? 'Unfriend'
      : member.friendshipStatus === 'pending'
        ? 'Cancel Request'
        : 'Add Friend'

  const variant = member.friendshipStatus === 'is_friend' ? 'outline' : 'secondary'

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={clsx(member.friendshipStatus === 'pending' && 'opacity-80')}
      onClick={() => onFriendToggle?.(member.id)}
    >
      {label}
    </Button>
  )
}
