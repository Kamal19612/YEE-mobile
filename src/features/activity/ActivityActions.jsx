import clsx from 'clsx'
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
  return (
    <div className="activity-meta flex items-center gap-1 border-t border-bb-border pt-2">
      <ActionBtn active={favorited} onClick={onLike} label="Like">
        <IconLike filled={favorited} className="h-5 w-5" />
        <span>
          {favoriteCount > 0 ? favoriteCount : ''} Like{favoriteCount === 1 ? '' : 's'}
        </span>
      </ActionBtn>
      <ActionBtn active={commentsOpen} onClick={onToggleComments} label="Comment">
        <IconComment className="h-5 w-5" />
        <span>
          {commentCount > 0 ? commentCount : ''} Comment{commentCount === 1 ? '' : 's'}
        </span>
      </ActionBtn>
      <ActionBtn onClick={onShare} label="Share">
        <IconShare className="h-5 w-5" />
        <span>Share</span>
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
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-bb-inner px-2 py-2 text-bb-sm font-medium transition-colors',
        active ? 'text-bb-primary' : 'text-bb-text hover:bg-bb-alt hover:text-bb-heading',
      )}
    >
      {children}
    </button>
  )
}

export function ActivityState({ favoriteCount, commentCount }) {
  if (!favoriteCount && !commentCount) return null
  return (
    <div className="activity-state mb-2 flex items-center gap-3 text-bb-xs text-bb-muted">
      {favoriteCount > 0 && (
        <span>
          {favoriteCount} like{favoriteCount > 1 ? 's' : ''}
        </span>
      )}
      {commentCount > 0 && (
        <span>
          {commentCount} comment{commentCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
