import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'

/**
 * Boutons d’adhésion pilotés strictement par `viewerStatus` (serveur).
 * Ne jamais recalculer le statut côté client.
 */
export function GroupMembershipActions({
  group,
  onJoin,
  onLeave,
  onRespondInvitation,
  busy = false,
  size = 'sm',
  showVisit = false,
}) {
  const { t } = useTranslation()
  const status = group?.viewerStatus || 'none'
  const visibility = group?.visibility || 'public'

  if (status === 'banned') return null

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center rounded-bb-inner bg-bb-alt px-3 py-1.5 text-bb-xs font-medium text-bb-muted">
        {t('groups.requestSent')}
      </span>
    )
  }

  if (status === 'invited') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-bb-xs font-medium text-bb-heading">{t('groups.youAreInvited')}</span>
        <Button
          type="button"
          size={size}
          disabled={busy}
          onClick={() => onRespondInvitation?.(true)}
        >
          {t('groups.acceptInvite')}
        </Button>
        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={busy}
          onClick={() => onRespondInvitation?.(false)}
        >
          {t('groups.declineInvite')}
        </Button>
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {showVisit && (
          <Button as={Link} to={`/groups/${group.id}`} size={size} variant="outline">
            {t('groups.visit')}
          </Button>
        )}
        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={busy}
          onClick={() => onLeave?.()}
        >
          {t('groups.leaveGroup')}
        </Button>
      </div>
    )
  }

  // none
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {showVisit && (
        <Button as={Link} to={`/groups/${group.id}`} size={size} variant="outline">
          {t('groups.visit')}
        </Button>
      )}
      <Button type="button" size={size} disabled={busy} onClick={() => onJoin?.()}>
        {visibility === 'private' ? t('groups.requestJoin') : t('groups.join')}
      </Button>
    </div>
  )
}

export function GroupCard({
  group,
  view = 'grid',
  onJoin,
  onLeave,
  onRespondInvitation,
  busy = false,
}) {
  const { t } = useTranslation()
  const visibility = group.visibility || 'public'
  const statusLabel =
    visibility === 'public'
      ? t('groups.status.public')
      : visibility === 'private'
        ? t('groups.status.private')
        : t('groups.status.secret')
  const membersLabel = t(
    group.membersCount === 1 ? 'groups.membersCount_one' : 'groups.membersCount_other',
    { count: group.membersCount },
  )

  const actions = (
    <GroupMembershipActions
      group={group}
      onJoin={() => onJoin?.(group.id)}
      onLeave={() => onLeave?.(group.id)}
      onRespondInvitation={(accept) => onRespondInvitation?.(group.id, accept)}
      busy={busy}
      showVisit
    />
  )

  if (view === 'list') {
    return (
      <li className="flex list-none items-center gap-4 rounded-bb border border-bb-border bg-bb-content p-4 shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover">
        <Link to={`/groups/${group.id}`}>
          <Avatar name={group.name} src={group.coverUrl} size="xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/groups/${group.id}`}
            className="text-bb-lg font-medium text-bb-heading hover:text-bb-primary"
          >
            {group.name}
          </Link>
          <p className="m-0 mt-1 line-clamp-2 text-bb-sm text-bb-text">{group.description}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-bb-xs text-bb-muted">
            <span>{statusLabel}</span>
            <span>{membersLabel}</span>
          </div>
        </div>
        {actions}
      </li>
    )
  }

  return (
    <li className="list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover">
      <div
        className="h-24 bg-cover bg-center"
        style={
          group.coverUrl
            ? { backgroundImage: `url(${group.coverUrl})` }
            : {
                backgroundImage:
                  'linear-gradient(135deg, #2f5bff 0%, #3d4f6a 48%, #c8922a 120%)',
              }
        }
      />
      <div className="-mt-8 px-4 pb-4 text-center">
        <Link to={`/groups/${group.id}`} className="inline-block">
          <Avatar name={group.name} src={group.coverUrl} size="xl" className="ring-4 ring-bb-content" />
        </Link>
        <div className="mt-2">
          <Link
            to={`/groups/${group.id}`}
            className="text-bb-md font-medium text-bb-heading hover:text-bb-primary"
          >
            {group.name}
          </Link>
        </div>
        <div className="mt-1 text-bb-xs text-bb-muted">
          {statusLabel} · {membersLabel}
        </div>
        <p className="m-0 mt-2 line-clamp-2 text-bb-sm text-bb-text">{group.description}</p>
        <div className="mt-4">{actions}</div>
      </div>
    </li>
  )
}
