import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchGroups } from '../../api/groups'
import { Avatar } from '../../components/ui/Avatar'
import { QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'

export function ProfileGroups({ member }) {
  const { t } = useTranslation()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!member?.id) {
        setGroups([])
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        setGroups(await fetchGroups({ userId: member.id }))
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setGroups([])
        setError(err.message || t('groups.empty'))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [member?.id, t],
  )

  useEffect(() => {
    load()
  }, [load])

  const onSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deleteGroup' && detail.groupId) {
        setGroups((prev) => prev.filter((g) => String(g.id) !== String(detail.groupId)))
        return
      }
      return load({ silent: true })
    },
    [load],
  )
  useBackgroundSync(QueryKeys.groups, onSync, { enabled: Boolean(member?.id) })

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-bb bg-bb-alt" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
  }

  if (!groups.length) {
    return <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('members.noGroups')}</div>
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
      {groups.map((group) => (
        <li key={group.id} className="bb-card flex items-center gap-3 p-4">
          <Avatar name={group.name} src={group.coverUrl} size="lg" />
          <div className="min-w-0">
            <Link
              to={`/groups/${group.id}`}
              className="block truncate font-medium text-bb-heading hover:text-bb-primary"
            >
              {group.name}
            </Link>
            <div className="text-bb-sm text-bb-muted">
              {t(
                group.membersCount === 1 ? 'groups.membersCount_one' : 'groups.membersCount_other',
                { count: group.membersCount },
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
