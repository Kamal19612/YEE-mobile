import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { formatTimeSince, stripHtml } from './utils'

export function ActivityComments({ comments = [], onAddComment, depth = 0 }) {
  return (
    <div
      className={
        depth === 0
          ? 'activity-comments threaded-comments mt-3 border-t border-bb-border pt-3'
          : 'mt-2 pl-2 sm:pl-3'
      }
    >
      {depth === 0 && <CommentForm onSubmit={(content) => onAddComment({ content })} />}
      <ul className="activity-comments-list m-0 mt-3 list-none space-y-3 p-0">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} onAddComment={onAddComment} depth={depth} />
        ))}
      </ul>
    </div>
  )
}

function CommentItem({ comment, onAddComment, depth }) {
  const { t } = useTranslation()
  const [replyOpen, setReplyOpen] = useState(false)

  return (
    <li className="acomment flex gap-2.5">
      <Avatar name={comment.userName} src={comment.avatar} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="acomment-content rounded-bb-inner bg-bb-alt px-3 py-2">
          <div className="mb-0.5 text-bb-sm font-semibold text-bb-heading">{comment.userName}</div>
          <div className="text-bb-sm text-bb-text">{stripHtml(comment.content)}</div>
        </div>
        <div className="acomment-meta mt-1 flex items-center gap-3 pl-1 text-bb-xs text-bb-muted">
          <span className="posted">{formatTimeSince(comment.date)}</span>
          {depth < 2 && (
            <button
              type="button"
              className="min-h-[32px] px-1 font-medium hover:text-bb-primary"
              onClick={() => setReplyOpen((v) => !v)}
            >
              {t('stories.actions.reply')}
            </button>
          )}
        </div>
        {replyOpen && (
          <div className="mt-2">
            <CommentForm
              placeholder={t('stories.actions.replyTo', { name: comment.userName })}
              autoFocus
              onSubmit={async (content) => {
                await onAddComment({ content, parentId: comment.id })
                setReplyOpen(false)
              }}
            />
          </div>
        )}
        {comment.children?.length > 0 && (
          <ActivityComments
            comments={comment.children}
            onAddComment={onAddComment}
            depth={depth + 1}
          />
        )}
      </div>
    </li>
  )
}

function CommentForm({ onSubmit, placeholder, autoFocus = false }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const currentUser = user || { displayName: 'Guest', avatar: null }
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit(value.trim())
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ac-reply-content flex items-start gap-2" onSubmit={submit}>
      <Avatar name={currentUser.displayName} src={currentUser.avatar} size="sm" />
      <div className="ac-textarea flex min-w-0 flex-1 gap-2">
        <input
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder || t('stories.feed.commentPlaceholder')}
          className="ac-input h-9 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
        />
        <Button type="submit" size="sm" disabled={!value.trim() || busy}>
          {t('stories.actions.reply')}
        </Button>
      </div>
    </form>
  )
}
