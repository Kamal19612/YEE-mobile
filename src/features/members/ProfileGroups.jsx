import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'

export function ProfileGroups({ member }) {
  const { t } = useTranslation()
  const groups = member.groups || []

  if (!groups.length) {
    return <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('members.noGroups')}</div>
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
            <div className="text-bb-sm text-bb-muted">
              {t(group.members === 1 ? 'groups.membersCount_one' : 'groups.membersCount_other', {
                count: group.members,
              })}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
