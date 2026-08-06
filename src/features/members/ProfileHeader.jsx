import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PROFILE_IMAGE_ACCEPT } from '../../api/users'
import { IconImage } from '../../components/icons'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { MEMBER_LANGUAGES } from '../../data/membersData'
import { formatTimeSince } from '../activity/utils'

/** Référence: #item-header (members/single/home.php) — profil YEE */
export function ProfileHeader({
  member,
  isOwn,
  onFriendToggle,
  onAvatarChange,
  onCoverChange,
  mediaBusy,
  mediaError,
}) {
  const { t } = useTranslation()
  const coverInputId = useId()
  const avatarInputId = useId()
  const langLabel =
    MEMBER_LANGUAGES.find((l) => l.code === member.language)?.label || member.language

  const pickAvatar = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onAvatarChange?.(file)
  }

  const pickCover = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onCoverChange?.(file)
  }

  return (
    <div
      id="item-header"
      role="complementary"
      data-bp-item-id={member.id}
      data-bp-item-component="members"
      className="users-header single-headers mb-5 overflow-hidden rounded-bb border border-bb-border bg-bb-content"
    >
      {/* z-20 au-dessus de l’avatar (-mt-12) pour que le bouton couverture reste cliquable sur mobile */}
      <div className="relative z-20">
        <div
          id="header-cover-image"
          className="h-44 bg-bb-cover bg-cover bg-center sm:h-48 bb:h-52"
          style={
            member.cover
              ? { backgroundImage: `url(${member.cover})` }
              : { backgroundColor: 'var(--bb-cover-image-background-color)' }
          }
        />
        {isOwn && (
          <>
            <input
              id={coverInputId}
              type="file"
              accept={PROFILE_IMAGE_ACCEPT}
              className="sr-only"
              onChange={pickCover}
            />
            <label
              htmlFor={coverInputId}
              className={[
                'absolute right-2 top-2 z-20 inline-flex max-w-[min(100%-1rem,11rem)] cursor-pointer items-center justify-center gap-1.5 rounded-bb-btn border px-2.5 py-1.5 text-bb-sm font-medium shadow-sm transition-colors duration-150 touch-manipulation sm:right-3 sm:top-3 sm:max-w-none sm:px-3',
                'border-[var(--bb-secondary-button-border-regular)] bg-[var(--bb-secondary-button-background-regular)] text-[var(--bb-secondary-button-text-regular)]',
                'hover:border-[var(--bb-secondary-button-border-hover)] hover:bg-[var(--bb-secondary-button-background-hover)] hover:text-[var(--bb-secondary-button-text-hover)]',
                mediaBusy === 'cover' ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
              aria-busy={mediaBusy === 'cover'}
            >
              <IconImage className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {mediaBusy === 'cover' ? t('members.uploading') : t('members.changeCover')}
              </span>
            </label>
          </>
        )}
      </div>

      <div id="item-header-cover-image" className="relative z-10 px-3 pb-4 pt-0 sm:px-4 bb:px-6">
        <div className="flex flex-col gap-4 bb:flex-row bb:items-end">
          <div className="item-header-avatar relative -mt-12 w-fit shrink-0 self-start">
            <Avatar
              name={member.displayName}
              src={member.avatar}
              size="xl"
              className="!h-[104px] !w-[104px] ring-4 ring-bb-content sm:!h-[120px] sm:!w-[120px]"
            />
            {isOwn && (
              <>
                <input
                  id={avatarInputId}
                  type="file"
                  accept={PROFILE_IMAGE_ACCEPT}
                  className="sr-only"
                  onChange={pickAvatar}
                />
                <label
                  htmlFor={avatarInputId}
                  className={[
                    'absolute bottom-1 right-1 inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border border-bb-border bg-bb-content px-2 py-1 text-[11px] font-medium text-bb-heading shadow-sm touch-manipulation',
                    'hover:border-bb-primary hover:text-bb-primary',
                    mediaBusy === 'avatar' ? 'pointer-events-none opacity-60' : '',
                  ].join(' ')}
                  aria-busy={mediaBusy === 'avatar'}
                >
                  {mediaBusy === 'avatar' ? '…' : t('members.changeAvatar')}
                </label>
              </>
            )}
          </div>

          <div id="item-header-content" className="min-w-0 flex-1 pb-1">
            <h2 className="user-nicename m-0 break-words text-bb-lg font-semibold text-bb-heading sm:text-bb-xl">
              {member.displayName}
            </h2>
            <p className="m-0 truncate text-bb-sm text-bb-muted">@{member.mentionName}</p>
            {member.bio && <p className="m-0 mt-2 max-w-xl text-bb-sm text-bb-text">{member.bio}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {member.country && <Chip>{member.country}</Chip>}
              {member.region && <Chip>{member.region}</Chip>}
              {langLabel && <Chip>{langLabel}</Chip>}
              {member.thematic && <Chip>{member.thematic}</Chip>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-bb-xs text-bb-muted">
              <span>
                {t('members.joined', {
                  date: new Date(member.joined).toLocaleDateString(),
                })}
              </span>
              <span>
                {member.online ? (
                  <span className="text-bb-success">{t('members.online')}</span>
                ) : (
                  t('members.active', { time: formatTimeSince(member.lastActive) })
                )}
              </span>
            </div>
            {isOwn && mediaError && (
              <p className="m-0 mt-2 text-bb-sm text-bb-danger" role="alert">
                {mediaError}
              </p>
            )}
          </div>

          <div className="flex w-full flex-wrap gap-2 pb-1 bb:w-auto">
            {isOwn ? (
              <>
                <Button
                  as={Link}
                  to={`/members/${member.id}/settings`}
                  variant="secondary"
                  size="sm"
                  className="min-h-10 flex-1 touch-manipulation sm:flex-none"
                >
                  {t('members.settings')}
                </Button>
                <Button
                  as={Link}
                  to={`/members/${member.id}/profile`}
                  variant="outline"
                  size="sm"
                  className="min-h-10 flex-1 touch-manipulation sm:flex-none"
                >
                  {t('members.editProfile')}
                </Button>
              </>
            ) : (
              <>
                <FriendAction member={member} onFriendToggle={onFriendToggle} />
                <Button
                  as={Link}
                  to="/messages"
                  variant="outline"
                  size="sm"
                  className="min-h-10 flex-1 touch-manipulation sm:flex-none"
                >
                  {t('members.message')}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-bb-border pt-3 text-center sm:flex sm:flex-wrap sm:gap-6">
          <Stat label={t('members.stats.stories')} value={member.stats.stories ?? member.stats.activity} />
          <Stat label={t('members.stats.peers')} value={member.stats.friends} />
          <Stat label={t('members.stats.cohorts')} value={member.stats.groups} />
        </div>
      </div>
    </div>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex rounded-bb-option bg-[var(--bb-label-background-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--bb-label-text-color)]">
      {children}
    </span>
  )
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-bb-md font-semibold text-bb-heading">{value}</div>
      <div className="truncate text-bb-xs text-bb-muted">{label}</div>
    </div>
  )
}

function FriendAction({ member, onFriendToggle }) {
  const { t } = useTranslation()
  if (member.friendshipStatus === 'is_friend') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-10 flex-1 touch-manipulation sm:flex-none"
        onClick={() => onFriendToggle?.(member.id)}
      >
        {t('members.disconnect')}
      </Button>
    )
  }
  if (member.friendshipStatus === 'pending') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-10 flex-1 touch-manipulation sm:flex-none"
        onClick={() => onFriendToggle?.(member.id)}
      >
        {t('members.cancelRequest')}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      className="min-h-10 flex-1 touch-manipulation sm:flex-none"
      onClick={() => onFriendToggle?.(member.id)}
    >
      {t('members.connect')}
    </Button>
  )
}
