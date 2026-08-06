import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { IconEllipsis, IconGlobe, IconUsersLock } from '../../components/icons'
import { STORY_LANGUAGES } from '../../data/activityData'
import { ActivityActions, ActivityState } from './ActivityActions'
import { ActivityComments } from './ActivityComments'
import { formatTimeSince, stripHtml } from './utils'

/** Carte d’actualité — buddypress/activity/entry.php adapté AfrEA-YEE */
export function ActivityCard({
  activity,
  onLike,
  onComment,
  defaultCommentsOpen = false,
}) {
  const { t } = useTranslation()
  const [commentsOpen, setCommentsOpen] = useState(
    defaultCommentsOpen || (activity.comments?.length > 0 && activity.commentCount <= 3),
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [menuOpen])

  const isGroup = activity.component === 'groups' && activity.group
  const displayName = activity.anonymous
    ? t('stories.anonymousAuthor')
    : activity.userName
  const isPublished = !activity.status || activity.status === 'published'
  const showComments = isPublished
  const [shareHint, setShareHint] = useState('')

  if (hidden) return null

  return (
    <li
      id={`activity-${activity.id}`}
      data-bp-activity-id={activity.id}
      data-story-status={activity.status}
      className={clsx(
        'activity-item mb-5 list-none rounded-bb border border-bb-border bg-bb-content p-3 pb-2.5 text-[0.875rem] leading-normal sm:p-[15px]',
        activity.favorited && 'has-liked',
        activity.status === 'pending' && 'border-l-4 border-l-bb-warning',
        activity.status === 'draft' && 'border-l-4 border-l-bb-muted',
        activity.status === 'rejected' && 'border-l-4 border-l-bb-danger',
      )}
    >
      <div className="bp-activity-head mb-3 flex gap-3">
        {isGroup ? (
          <div className="bp-activity-head-group flex min-w-0 flex-1 gap-3">
            <div className="activity-group-avatar relative shrink-0">
              <Avatar name={activity.group.name} src={activity.group.avatar} size="lg" />
              {!activity.anonymous && (
                <div className="author-avatar absolute -bottom-1 -right-1 rounded-full ring-2 ring-bb-content">
                  <Avatar name={activity.userName} src={activity.avatar} size="sm" />
                </div>
              )}
            </div>
            <div className="activity-header activity-header--group min-w-0">
              <div className="activity-group-heading">
                <Link
                  to={activity.group.link || `/groups/${activity.group.id}`}
                  className="font-semibold text-bb-heading hover:text-bb-primary"
                >
                  {activity.group.name}
                </Link>
              </div>
              <div className="activity-group-post-meta flex flex-wrap items-center gap-x-2 gap-y-0.5 text-bb-sm text-bb-muted">
                <span className="activity-post-author font-medium text-bb-heading">{displayName}</span>
                <span>·</span>
                <span className="time-since">{formatTimeSince(activity.date)}</span>
                {activity.edited && <span>({t('stories.edited')})</span>}
                <PrivacyIcon privacy={activity.privacy} />
                <StatusBadge status={activity.status} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="activity-avatar item-avatar shrink-0">
              {activity.anonymous ? (
                <Avatar name="?" size="lg" />
              ) : (
                <Link to={activity.userLink || `/members/${activity.userId}`}>
                  <Avatar name={activity.userName} src={activity.avatar} size="lg" />
                </Link>
              )}
            </div>
            <div className="activity-header min-w-0 flex-1">
              <div className="font-semibold text-bb-heading">
                {activity.anonymous ? (
                  displayName
                ) : (
                  <Link
                    to={activity.userLink || `/members/${activity.userId}`}
                    className="hover:text-bb-primary"
                  >
                    {displayName}
                  </Link>
                )}
                <span className="font-normal text-bb-text"> {t('stories.postedUpdate')}</span>
              </div>
              <p className="activity-date m-0 flex flex-wrap items-center gap-2 text-bb-sm text-bb-muted">
                <span className="time-since">{formatTimeSince(activity.date)}</span>
                {activity.edited && <span>({t('stories.edited')})</span>}
                <PrivacyIcon privacy={activity.privacy} />
                <StatusBadge status={activity.status} />
              </p>
            </div>
          </>
        )}

        <div className="relative ml-auto shrink-0" ref={menuRef}>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-heading"
            aria-label={t('nav.more')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconEllipsis />
          </button>
          {menuOpen && (
            <ul className="absolute right-0 top-[calc(100%+4px)] z-dropdown m-0 min-w-[160px] list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content p-0 shadow-dropdown">
              <li>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-bb-sm text-bb-heading hover:bg-bb-alt"
                  onClick={() => {
                    const text = [activity.title, stripHtml(activity.content || '')]
                      .filter(Boolean)
                      .join('\n\n')
                    navigator.clipboard?.writeText(text).catch(() => {})
                    setMenuOpen(false)
                  }}
                >
                  {t('stories.copyText')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-bb-sm text-bb-heading hover:bg-bb-alt"
                  onClick={() => {
                    setHidden(true)
                    setMenuOpen(false)
                  }}
                >
                  {t('stories.hide')}
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="activity-content mb-2">
        {activity.title && (
          <h3 className="mb-2 mt-0 text-bb-lg font-semibold text-bb-heading">{activity.title}</h3>
        )}

        {activity.content && (
          <div className="activity-inner mb-3 whitespace-pre-wrap text-bb-base text-bb-heading">
            {stripHtml(activity.content)}
          </div>
        )}

        {activity.tags && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {activity.tags.country && <TagChip>{activity.tags.country}</TagChip>}
            {activity.tags.thematic && <TagChip>{activity.tags.thematic}</TagChip>}
            {activity.tags.language && (
              <TagChip>
                {STORY_LANGUAGES.find((l) => l.code === activity.tags.language)?.label ||
                  activity.tags.language}
              </TagChip>
            )}
          </div>
        )}

        {activity.media?.length > 0 && (
          <div className="bb-activity-media-wrap mb-3 overflow-hidden rounded-bb-inner">
            {activity.media.map((m, index) => {
              const mediaKey = m.id ?? m.url ?? `${m.type || 'media'}-${index}`
              if (m.type === 'audio') {
                return (
                  <div key={mediaKey} className="bg-bb-alt p-3">
                    <audio controls src={m.url} className="w-full" />
                  </div>
                )
              }
              if (m.type === 'video') {
                return (
                  <video
                    key={mediaKey}
                    controls
                    src={m.url}
                    className="max-h-[420px] w-full bg-black"
                  />
                )
              }
              return (
                <img
                  key={mediaKey}
                  src={m.url}
                  alt={m.alt || ''}
                  className="max-h-[420px] w-full object-cover"
                />
              )
            })}
          </div>
        )}

        {showComments && (
          <ActivityState favoriteCount={activity.favoriteCount} commentCount={activity.commentCount} />
        )}
      </div>

      {showComments && (
        <ActivityActions
          favorited={activity.favorited}
          favoriteCount={activity.favoriteCount}
          commentCount={activity.commentCount}
          commentsOpen={commentsOpen}
          onLike={() => onLike?.(activity.id)}
          onToggleComments={() => setCommentsOpen((v) => !v)}
          onShare={async () => {
            const text = [activity.title, stripHtml(activity.content || '')].filter(Boolean).join('\n\n')
            const url = `${window.location.origin}${window.location.pathname}#activity-${activity.id}`
            try {
              if (navigator.share) {
                await navigator.share({ title: activity.title || displayName, text, url })
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(`${text}\n${url}`)
                setShareHint(t('stories.copied', { defaultValue: 'Lien copié' }))
                setTimeout(() => setShareHint(''), 2000)
              }
            } catch {
              /* cancelled */
            }
          }}
        />
      )}

      {shareHint && (
        <p className="m-0 mt-2 text-center text-bb-xs text-bb-success">{shareHint}</p>
      )}

      {showComments && commentsOpen && (
        <ActivityComments
          comments={activity.comments || []}
          onAddComment={(payload) => onComment?.(activity.id, payload)}
        />
      )}
    </li>
  )
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
  if (!status || status === 'published') return null
  const styles = {
    draft: 'bg-bb-alt text-bb-muted',
    pending: 'bg-[rgba(237,150,21,0.15)] text-bb-warning',
    rejected: 'bg-[rgba(219,34,42,0.12)] text-bb-danger',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-bb-option px-2 py-0.5 text-[11px] font-semibold',
        styles[status],
      )}
    >
      {t(`stories.status.${status}`)}
    </span>
  )
}

function TagChip({ children }) {
  return (
    <span className="inline-flex rounded-bb-option bg-[var(--bb-label-background-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--bb-label-text-color)]">
      {children}
    </span>
  )
}

function PrivacyIcon({ privacy }) {
  if (privacy === 'loggedin') {
    return (
      <span title="Members only" className="inline-flex items-center">
        <IconUsersLock className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <span title="Public" className="inline-flex items-center">
      <IconGlobe className="h-3.5 w-3.5" />
    </span>
  )
}
