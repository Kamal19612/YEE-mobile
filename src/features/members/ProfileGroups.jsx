import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'

export function ProfileGroups({ member }) {
  const groups = member.groups || []

  if (!groups.length) {
    return <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">No groups to show.</div>
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
      {groups.map((group) => (
        <li key={group.id} className="bb-card flex items-center gap-3 p-4">
          <Avatar name={group.name} size="lg" />
          <div className="min-w-0">
            <Link to="/groups" className="block truncate font-medium text-bb-heading hover:text-bb-primary">
              {group.name}
            </Link>
            <div className="text-bb-sm text-bb-muted">{group.members} members</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
