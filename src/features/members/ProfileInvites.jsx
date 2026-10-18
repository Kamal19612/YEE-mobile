import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchMyGroupInvites } from '../../api/users'
import { respondToInvitation } from '../../api/groups'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'

/** Invitations de groupes en attente (données réelles App API). */
export function ProfileInvites() {
  const { t } = useTranslation()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      setInvites(await fetchMyGroupInvites())
      if (silent) setError(null)
    } catch (err) {
      if (silent) return
      setInvites([])
      setError(err.message || t('members.followListError'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const onSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deleteGroup' && detail.groupId) {
        setInvites((prev) => prev.filter((g) => String(g.id) !== String(detail.groupId)))
        return
      }
      return load({ silent: true })
    },
    [load],
  )
  useBackgroundSync([QueryKeys.groups, QueryKeys.members], onSync)

  const respond = async (groupId, accept) => {
    setBusyId(groupId)
    setError(null)
    const snapshot = invites
    setInvites((prev) => prev.filter((g) => String(g.id) !== String(groupId)))
    try {
      await respondToInvitation(groupId, accept)
      invalidate(QueryKeys.groups, { reason: 'inviteResponse', groupId, accept })
    } catch (err) {
      setInvites(snapshot)
      setError(err.message || t('groups.inviteFailed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bb-card p-5">
        <h2 className="m-0 mb-1 text-bb-md font-semibold text-bb-heading">{t('members.groupInvitesTitle')}</h2>
        <p className="m-0 text-bb-sm text-bb-muted">{t('members.groupInvitesHint')}</p>
      </div>

      {loading && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('members.loadingFollows')}</div>
      )}
      {!loading && error && (
        <div className="bb-card p-4 text-bb-sm text-bb-danger" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && invites.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('members.noGroupInvites')}</div>
      )}
      {!loading && invites.length > 0 && (
        <ul className="m-0 list-none space-y-3 p-0">
          {invites.map((group) => (
            <li key={group.id} className="bb-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={group.name} src={group.coverUrl} size="lg" />
                <div className="min-w-0">
                  <Link
                    to={`/groups/${group.id}`}
                    className="block truncate font-medium text-bb-heading hover:text-bb-primary"
                  >
                    {group.name}
                  </Link>
                  <div className="text-bb-xs text-bb-muted">
                    {t(`groups.status.${group.visibility || 'public'}`)} ·{' '}
                    {t(
                      group.membersCount === 1 ? 'groups.membersCount_one' : 'groups.membersCount_other',
                      { count: group.membersCount },
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === group.id}
                  onClick={() => respond(group.id, true)}
                >
                  {t('groups.acceptInvite')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId === group.id}
                  onClick={() => respond(group.id, false)}
                >
                  {t('groups.declineInvite')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
