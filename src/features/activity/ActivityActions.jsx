import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconComment, IconLike, IconShare } from '../../components/icons'

export function ActivityActions({
  favorited,
  favoriteCount,
  commentCount,
  commentsOpen,
  onLike,
  onToggleComments,
  onShare,
}) {
  const { t } = useTranslation()

  return (
    <div className="activity-meta flex items-center gap-0.5 border-t border-bb-border pt-2 sm:gap-1">
      <ActionBtn active={favorited} onClick={onLike} label={t('stories.actions.like')}>
        <IconLike filled={favorited} className="h-5 w-5 shrink-0" />
        {favoriteCount > 0 ? (
          <span className="tabular-nums">{favoriteCount}</span>
        ) : null}
      </ActionBtn>
      <ActionBtn active={commentsOpen} onClick={onToggleComments} label={t('stories.actions.comment')}>
        <IconComment className="h-5 w-5 shrink-0" />
        {commentCount > 0 ? (
          <span className="tabular-nums">{commentCount}</span>
        ) : null}
      </ActionBtn>
      <ActionBtn onClick={onShare} label={t('stories.actions.share')}>
        <IconShare className="h-5 w-5 shrink-0" />
      </ActionBtn>
    </div>
  )
}

function ActionBtn({ children, onClick, active, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        'inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-bb-inner px-1.5 py-2.5 text-bb-xs font-medium transition-all duration-150 ease-bb sm:gap-1.5 sm:px-2 sm:text-bb-sm',
        active
          ? 'bg-[rgba(47,91,255,0.08)] text-bb-primary'
          : 'text-bb-text hover:bg-bb-alt hover:text-bb-heading',
      )}
    >
      {children}
    </button>
  )
}

export function ActivityState({ favoriteCount, commentCount, onOpenLikers }) {
  const { t } = useTranslation()
  if (!favoriteCount && !commentCount) return null
  const likesLabel = t(
    favoriteCount === 1 ? 'stories.actions.likeCount_one' : 'stories.actions.likeCount_other',
    { count: favoriteCount },
  )
  const commentsLabel = t(
    commentCount === 1
      ? 'stories.actions.commentCount_one'
      : 'stories.actions.commentCount_other',
    { count: commentCount },
  )
  return (
    <div className="activity-state mb-2 flex items-center gap-3 text-bb-xs text-bb-muted">
      {favoriteCount > 0 &&
        (onOpenLikers ? (
          <button
            type="button"
            className="inline-flex min-h-[32px] items-center gap-1 font-medium hover:text-bb-primary"
            title={likesLabel}
            aria-label={likesLabel}
            onClick={onOpenLikers}
          >
            <IconLike filled className="h-3.5 w-3.5" />
            <span className="tabular-nums">{favoriteCount}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1" title={likesLabel}>
            <IconLike filled className="h-3.5 w-3.5" />
            <span className="tabular-nums">{favoriteCount}</span>
          </span>
        ))}
      {commentCount > 0 && (
        <span className="inline-flex items-center gap-1" title={commentsLabel} aria-label={commentsLabel}>
          <IconComment className="h-3.5 w-3.5" />
          <span className="tabular-nums">{commentCount}</span>
        </span>
      )}
    </div>
  )
}
