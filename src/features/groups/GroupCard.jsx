import { Link } from 'react-router-dom'
import clsx from 'clsx'
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
  layout = 'inline',
}) {
  const { t } = useTranslation()
  const status = group?.viewerStatus || 'none'
  const visibility = group?.visibility || 'public'
  const stacked = layout === 'stack'
  const wrapClass = stacked
    ? 'flex w-full flex-col gap-2 sm:w-auto'
    : 'flex flex-wrap items-center justify-center gap-2'
  const btnClass = stacked ? 'min-h-10 w-full touch-manipulation sm:w-auto' : undefined

  if (status === 'banned') return null

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center justify-center rounded-bb-inner bg-bb-alt px-3 py-1.5 text-bb-xs font-medium text-bb-muted">
        {t('groups.requestSent')}
      </span>
    )
  }

  if (status === 'invited') {
    return (
      <div className={wrapClass}>
        <span className="text-bb-xs font-medium text-bb-heading">{t('groups.youAreInvited')}</span>
        <Button
          type="button"
          size={size}
          className={btnClass}
          disabled={busy}
          onClick={() => onRespondInvitation?.(true)}
        >
          {t('groups.acceptInvite')}
        </Button>
        <Button
          type="button"
          size={size}
          variant="outline"
          className={btnClass}
          disabled={busy}
          onClick={() => onRespondInvitation?.(false)}
        >
          {t('groups.declineInvite')}
        </Button>
      </div>
    )
  }

  if (status === 'active') {
    if (group?.viewerIsCreator && !showVisit) return null
    return (
      <div className={wrapClass}>
        {showVisit && (
          <Button as={Link} to={`/groups/${group.id}`} size={size} variant="outline" className={btnClass}>
            {t('groups.visit')}
          </Button>
        )}
        {group?.viewerIsCreator ? null : (
          <Button
            type="button"
            size={size}
            variant="outline"
            className={btnClass}
            disabled={busy}
            onClick={() => onLeave?.()}
          >
            {t('groups.leaveGroup')}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      {showVisit && (
        <Button as={Link} to={`/groups/${group.id}`} size={size} variant="outline" className={btnClass}>
          {t('groups.visit')}
        </Button>
      )}
      <Button type="button" size={size} className={btnClass} disabled={busy} onClick={() => onJoin?.()}>
        {visibility === 'private' ? t('groups.requestJoin') : t('groups.join')}
      </Button>
    </div>
  )
}

function GroupSecondaryInfo({ group, statusLabel, membersLabel, compact = false }) {
  const description = typeof group.description === 'string' ? group.description.trim() : ''
  if (!description && !statusLabel && !membersLabel) return null

  if (compact) {
    return (
      <div className="mt-1.5 flex w-full flex-col items-center gap-0.5">
        {description ? (
          <p className="m-0 line-clamp-2 w-full text-bb-xs leading-snug text-bb-text">{description}</p>
        ) : null}
        <p className="m-0 line-clamp-1 text-[11px] text-bb-muted">
          {[statusLabel, membersLabel].filter(Boolean).join(' · ')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-1.5 flex flex-col items-start gap-0.5 text-left">
      {description ? <p className="m-0 line-clamp-2 text-bb-sm text-bb-text">{description}</p> : null}
      <p className="m-0 line-clamp-1 text-bb-xs text-bb-muted">
        {[statusLabel, membersLabel].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
}

const deleteBtnClass =
  'min-h-8 shrink-0 border-[#b01b22] px-2.5 text-[11px] text-[var(--bb-danger-color)] hover:border-[#8f161c] hover:bg-red-50 hover:text-[#8f161c]'

export function GroupCard({
  group,
  view = 'grid',
  onJoin,
  onLeave,
  onRespondInvitation,
  onDelete,
  canDelete = false,
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
  const avatarSrc = group.avatarUrl || group.coverUrl

  const actions = (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <GroupMembershipActions
        group={group}
        onJoin={() => onJoin?.(group.id)}
        onLeave={() => onLeave?.(group.id)}
        onRespondInvitation={(accept) => onRespondInvitation?.(group.id, accept)}
        busy={busy}
        showVisit
        layout="inline"
      />
      {canDelete ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={deleteBtnClass}
          disabled={busy}
          onClick={() => onDelete?.(group)}
        >
          {t('groups.delete')}
        </Button>
      ) : null}
    </div>
  )

  if (view === 'list') {
    return (
      <li className="flex list-none flex-col gap-3 rounded-bb border border-bb-border bg-bb-content p-3 shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <Link to={`/groups/${group.id}`} className="shrink-0 self-start">
          <Avatar name={group.name} src={avatarSrc} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/groups/${group.id}`}
            className="break-words text-bb-md font-medium text-bb-heading hover:text-bb-primary"
          >
            {group.name}
          </Link>
          <GroupSecondaryInfo group={group} statusLabel={statusLabel} membersLabel={membersLabel} />
        </div>
        <div className="shrink-0">{actions}</div>
      </li>
    )
  }

  return (
    <li className="list-none w-full overflow-hidden rounded-bb border border-bb-border bg-bb-content text-center shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover sm:max-w-[14rem]">
      <div className="flex flex-col items-center px-4 py-5">
        <Link to={`/groups/${group.id}`} className="inline-block">
          <Avatar name={group.name} src={avatarSrc} size="xl" className="ring-2 ring-bb-border/60" />
        </Link>
        <Link
          to={`/groups/${group.id}`}
          className="mt-2.5 line-clamp-2 text-bb-sm font-medium text-bb-heading hover:text-bb-primary"
        >
          {group.name}
        </Link>
        <GroupSecondaryInfo
          group={group}
          statusLabel={statusLabel}
          membersLabel={membersLabel}
          compact
        />
        <div className="mt-3">{actions}</div>
      </div>
    </li>
  )
}
