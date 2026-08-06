import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { MEMBER_LANGUAGES } from '../../data/membersData'
import { formatTimeSince } from '../activity/utils'

/**
 * Carte membre.
 * `variant="directory"` — annuaire App API (avatar, nom, profession).
 * `variant="full"` — profil riche (cover, stats, follow) utilisé ailleurs.
 */
export function MemberCard({
  member,
  view = 'grid',
  onFriendToggle,
  variant = 'full',
}) {
  const { t } = useTranslation()

  if (variant === 'directory') {
    return <DirectoryMemberCard member={member} view={view} />
  }

  const langLabel =
    MEMBER_LANGUAGES.find((l) => l.code === member.language)?.label || member.language

  if (view === 'list') {
    return (
      <li className="bs-item-wrap flex list-none flex-col gap-3 rounded-bb border border-bb-border bg-bb-content p-3 shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <Link to={`/members/${member.id}`} className="relative shrink-0 self-start">
          <Avatar name={member.displayName} src={member.avatar} size="xl" />
          {member.online && <OnlineDot />}
        </Link>
        <div className="item min-w-0 flex-1">
          <div className="item-title">
            <Link
              to={`/members/${member.id}`}
              className="break-words text-bb-lg font-medium text-bb-heading hover:text-bb-primary"
            >
              {member.displayName}
            </Link>
          </div>
          <div className="item-meta truncate text-bb-sm text-bb-muted">@{member.mentionName}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {member.country && <Chip>{member.country}</Chip>}
            {member.region && <Chip>{member.region}</Chip>}
            {langLabel && <Chip>{langLabel}</Chip>}
            {member.thematic && <Chip>{member.thematic}</Chip>}
          </div>
          {formatTimeSince(member.lastActive) ? (
            <div className="mt-1 text-bb-xs text-bb-muted">
              {t('members.active', { time: formatTimeSince(member.lastActive) })}
            </div>
          ) : null}
        </div>
        <div className="action w-full shrink-0 sm:w-auto">
          <FriendButton member={member} onFriendToggle={onFriendToggle} />
        </div>
      </li>
    )
  }

  return (
    <li className="bs-item-wrap list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content text-center shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover">
      <div
        className="h-24 bg-cover bg-center"
        style={
          member.cover
            ? { backgroundImage: `url(${member.cover})` }
            : {
                backgroundImage:
                  'linear-gradient(135deg, #2f5bff 0%, #3d4f6a 48%, #c8922a 120%)',
              }
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
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {member.country && <Chip>{member.country}</Chip>}
          {member.thematic && <Chip>{member.thematic}</Chip>}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-bb-xs text-bb-muted">
          <span>
            <strong className="text-bb-heading">{member.stats.stories ?? member.stats.activity}</strong>{' '}
            {t('members.stats.stories')}
          </span>
          <span>
            <strong className="text-bb-heading">{member.stats.groups}</strong>{' '}
            {t('members.stats.cohorts')}
          </span>
        </div>
        <div className="action mt-4">
          <FriendButton member={member} onFriendToggle={onFriendToggle} />
        </div>
      </div>
    </li>
  )
}

function DirectoryMemberCard({ member, view }) {
  const { t } = useTranslation()
  const avatarSrc = member.avatarUrl || member.avatar
  const profession = member.profession || ''

  if (view === 'list') {
    return (
      <li className="flex list-none flex-col gap-3 rounded-bb border border-bb-border bg-bb-content p-3 shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover sm:flex-row sm:items-center sm:gap-4 sm:p-4">
        <Link to={`/members/${member.id}`} className="shrink-0 self-start">
          <Avatar name={member.displayName} src={avatarSrc} size="xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={`/members/${member.id}`}
            className="break-words text-bb-lg font-medium text-bb-heading hover:text-bb-primary"
          >
            {member.displayName}
          </Link>
          {profession ? (
            <p className="m-0 mt-1 line-clamp-2 text-bb-sm text-bb-text">{profession}</p>
          ) : (
            <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('members.noProfession')}</p>
          )}
        </div>
        <Button
          as={Link}
          to={`/members/${member.id}`}
          variant="outline"
          size="sm"
          className="min-h-10 w-full touch-manipulation sm:w-auto"
        >
          {t('members.viewProfile')}
        </Button>
      </li>
    )
  }

  return (
    <li className="list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content text-center shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover">
      <div className="flex flex-col items-center px-4 py-6">
        <Link to={`/members/${member.id}`} className="inline-block">
          <Avatar name={member.displayName} src={avatarSrc} size="xl" className="ring-2 ring-bb-border/60" />
        </Link>
        <Link
          to={`/members/${member.id}`}
          className="mt-3 line-clamp-2 text-bb-md font-medium text-bb-heading hover:text-bb-primary"
        >
          {member.displayName}
        </Link>
        {profession ? (
          <p className="m-0 mt-1.5 line-clamp-2 text-bb-sm text-bb-text">{profession}</p>
        ) : (
          <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">{t('members.noProfession')}</p>
        )}
        <Button
          as={Link}
          to={`/members/${member.id}`}
          variant="outline"
          size="sm"
          className="mt-4 min-h-10 w-full touch-manipulation"
        >
          {t('members.viewProfile')}
        </Button>
      </div>
    </li>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex rounded-bb-option bg-[var(--bb-label-background-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--bb-label-text-color)]">
      {children}
    </span>
  )
}

function OnlineDot() {
  return (
    <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-bb-content bg-bb-success" />
  )
}

function FriendButton({ member, onFriendToggle }) {
  const { t } = useTranslation()
  if (member.friendshipStatus === 'self') {
    return (
      <Button as={Link} to={`/members/${member.id}`} variant="outline" size="sm" className="min-h-10 w-full touch-manipulation sm:w-auto">
        {t('members.viewProfile')}
      </Button>
    )
  }

  const label =
    member.friendshipStatus === 'is_friend'
      ? t('members.disconnect')
      : member.friendshipStatus === 'pending'
        ? t('members.cancelRequest')
        : t('members.connect')

  const variant = member.friendshipStatus === 'is_friend' ? 'outline' : 'secondary'

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={clsx('min-h-10 w-full touch-manipulation sm:w-auto', member.friendshipStatus === 'pending' && 'opacity-80')}
      onClick={() => onFriendToggle?.(member.id)}
    >
      {label}
    </Button>
  )
}
