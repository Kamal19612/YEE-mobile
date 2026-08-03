import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { demoMembers } from '../../data/membersData'

export function ProfileFriends({ member }) {
  const friends = demoMembers.filter((m) => member.friends?.includes(m.id))

  if (!friends.length) {
    return <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">No friends to show.</div>
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {friends.map((friend) => (
        <li key={friend.id} className="bb-card flex items-center gap-3 p-4">
          <Link to={`/members/${friend.id}`}>
            <Avatar name={friend.displayName} src={friend.avatar} size="lg" />
          </Link>
          <div className="min-w-0">
            <Link
              to={`/members/${friend.id}`}
              className="block truncate font-medium text-bb-heading hover:text-bb-primary"
            >
              {friend.displayName}
            </Link>
            <div className="text-bb-sm text-bb-muted">@{friend.mentionName}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
