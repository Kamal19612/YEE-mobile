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
    <div className="activity-meta flex items-center gap-1 border-t border-bb-border pt-2">
      <ActionBtn active={favorited} onClick={onLike} label={t('stories.actions.like')}>
        <IconLike filled={favorited} className="h-5 w-5" />
        <span>
          {favoriteCount > 0
            ? t(favoriteCount === 1 ? 'stories.actions.likeCount_one' : 'stories.actions.likeCount_other', {
                count: favoriteCount,
              })
            : t('stories.actions.like')}
        </span>
      </ActionBtn>
      <ActionBtn active={commentsOpen} onClick={onToggleComments} label={t('stories.actions.comment')}>
        <IconComment className="h-5 w-5" />
        <span>
          {commentCount > 0
            ? t(
                commentCount === 1
                  ? 'stories.actions.commentCount_one'
                  : 'stories.actions.commentCount_other',
                { count: commentCount },
              )
            : t('stories.actions.comment')}
        </span>
      </ActionBtn>
      <ActionBtn onClick={onShare} label={t('stories.actions.share')}>
        <IconShare className="h-5 w-5" />
        <span>{t('stories.actions.share')}</span>
      </ActionBtn>
    </div>
  )
}

function ActionBtn({ children, onClick, active, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx(
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-bb-inner px-2 py-2 text-bb-sm font-medium transition-all duration-150 ease-bb',
        active
          ? 'bg-[rgba(47,91,255,0.08)] text-bb-primary'
          : 'text-bb-text hover:bg-bb-alt hover:text-bb-heading',
      )}
    >
      {children}
    </button>
  )
}

export function ActivityState({ favoriteCount, commentCount }) {
  const { t } = useTranslation()
  if (!favoriteCount && !commentCount) return null
  return (
    <div className="activity-state mb-2 flex items-center gap-3 text-bb-xs text-bb-muted">
      {favoriteCount > 0 && (
        <span>
          {t(favoriteCount === 1 ? 'stories.actions.likeCount_one' : 'stories.actions.likeCount_other', {
            count: favoriteCount,
          })}
        </span>
      )}
      {commentCount > 0 && (
        <span>
          {t(
            commentCount === 1
              ? 'stories.actions.commentCount_one'
              : 'stories.actions.commentCount_other',
            { count: commentCount },
          )}
        </span>
      )}
    </div>
  )
}
