import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { IconEllipsis, IconGlobe, IconUsersLock } from '../../components/icons'
import { ActivityActions, ActivityState } from './ActivityActions'
import { ActivityComments } from './ActivityComments'
import { formatTimeSince, stripHtml } from './utils'

/** Référence: buddypress/activity/entry.php */
export function ActivityCard({
  activity,
  onLike,
  onComment,
  onVotePoll,
  defaultCommentsOpen = false,
}) {
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

  if (hidden) return null

  return (
    <li
      id={`activity-${activity.id}`}
      data-bp-activity-id={activity.id}
      className={clsx(
        'activity-item mb-5 list-none rounded-bb border border-bb-border bg-bb-content p-3 pb-2.5 text-[0.875rem] leading-normal sm:p-[15px]',
        activity.favorited && 'has-liked',
      )}
    >
      <div className="bp-activity-head mb-3 flex gap-3">
        {isGroup ? (
          <div className="bp-activity-head-group flex min-w-0 flex-1 gap-3">
            <div className="activity-group-avatar relative shrink-0">
              <Avatar name={activity.group.name} src={activity.group.avatar} size="lg" />
              <div className="author-avatar absolute -bottom-1 -right-1 rounded-full ring-2 ring-bb-content">
                <Avatar name={activity.userName} src={activity.avatar} size="sm" />
              </div>
            </div>
            <div className="activity-header activity-header--group min-w-0">
              <div className="activity-group-heading">
                <a href={activity.group.link} className="font-semibold text-bb-heading hover:text-bb-primary">
                  {activity.group.name}
                </a>
              </div>
              <div className="activity-group-post-meta flex flex-wrap items-center gap-x-2 gap-y-0.5 text-bb-sm text-bb-muted">
                <span className="activity-post-author">
                  <a href={activity.userLink} className="font-medium text-bb-heading hover:text-bb-primary">
                    {activity.userName}
                  </a>
                </span>
                <span>·</span>
                <span className="time-since">{formatTimeSince(activity.date)}</span>
                {activity.edited && <span className="activity-edited">(edited)</span>}
                <PrivacyIcon privacy={activity.privacy} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="activity-avatar item-avatar shrink-0">
              <a href={activity.userLink}>
                <Avatar name={activity.userName} src={activity.avatar} size="lg" />
              </a>
            </div>
            <div className="activity-header min-w-0 flex-1">
              <div className="font-semibold text-bb-heading">
                <a href={activity.userLink} className="hover:text-bb-primary">
                  {activity.userName}
                </a>
                <span className="font-normal text-bb-text"> posted an update</span>
              </div>
              <p className="activity-date m-0 flex flex-wrap items-center gap-2 text-bb-sm text-bb-muted">
                <span className="time-since">{formatTimeSince(activity.date)}</span>
                {activity.edited && <span>(edited)</span>}
                <PrivacyIcon privacy={activity.privacy} />
              </p>
            </div>
          </>
        )}

        <div className="relative ml-auto shrink-0" ref={menuRef}>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-heading"
            aria-label="More options"
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
                    const text = stripHtml(activity.content || '')
                    navigator.clipboard?.writeText(text).catch(() => {})
                    setMenuOpen(false)
                  }}
                >
                  Copy text
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
                  Hide post
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div className="activity-content mb-2">
        {activity.content && (
          <div className="activity-inner mb-3 whitespace-pre-wrap text-bb-base text-bb-heading">
            {stripHtml(activity.content)}
          </div>
        )}

        {activity.media?.length > 0 && (
          <div className="bb-activity-media-wrap mb-3 overflow-hidden rounded-bb-inner">
            {activity.media.map((m) => (
              <img
                key={m.id}
                src={m.url}
                alt={m.alt || ''}
                className="max-h-[420px] w-full object-cover"
              />
            ))}
          </div>
        )}

        {activity.poll && (
          <PollBlock poll={activity.poll} onVote={(optionId) => onVotePoll?.(activity.id, optionId)} />
        )}

        <ActivityState favoriteCount={activity.favoriteCount} commentCount={activity.commentCount} />
      </div>

      <ActivityActions
        favorited={activity.favorited}
        favoriteCount={activity.favoriteCount}
        commentCount={activity.commentCount}
        commentsOpen={commentsOpen}
        onLike={() => onLike?.(activity.id)}
        onToggleComments={() => setCommentsOpen((v) => !v)}
        onShare={() => {
          if (navigator.share) {
            navigator.share({ title: `${activity.userName}'s Post`, text: stripHtml(activity.content) }).catch(() => {})
          }
        }}
      />

      {commentsOpen && (
        <ActivityComments
          comments={activity.comments || []}
          onAddComment={(payload) => onComment?.(activity.id, payload)}
        />
      )}
    </li>
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

function PollBlock({ poll, onVote }) {
  return (
    <div className="mb-3 rounded-bb-inner border border-bb-border p-3">
      <div className="mb-3 font-semibold text-bb-heading">{poll.question}</div>
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = poll.totalVotes ? Math.round((opt.votes / poll.totalVotes) * 100) : 0
          const voted = poll.votedOptionId === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={Boolean(poll.votedOptionId)}
              onClick={() => onVote?.(opt.id)}
              className={clsx(
                'relative w-full overflow-hidden rounded-bb-inner border px-3 py-2 text-left text-bb-sm transition-colors',
                voted
                  ? 'border-bb-primary text-bb-primary'
                  : 'border-bb-border text-bb-heading hover:border-bb-primary',
                poll.votedOptionId && 'cursor-default',
              )}
            >
              {poll.votedOptionId && (
                <span
                  className="absolute inset-y-0 left-0 bg-[rgba(var(--bb-primary-color-rgb),0.1)]"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative z-[1] flex justify-between gap-2">
                <span>{opt.label}</span>
                {poll.votedOptionId && <span>{pct}%</span>}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-bb-xs text-bb-muted">{poll.totalVotes} votes</div>
    </div>
  )
}
