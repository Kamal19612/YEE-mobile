import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { ActivityActions, ActivityState } from './ActivityActions'
import { formatTimeSince } from './utils'

/**
 * Carte post Feed App API.
 * Auteur : même pattern Avatar + nom que MemberCard (sans bouton follow).
 */
export function FeedPostCard({
  post,
  onLike,
  onDelete,
  onLoadComments,
  onAddComment,
  onDeleteComment,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsCursor, setCommentsCursor] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const author = post.author || {}
  const authorName = author.displayName || t('stories.anonymousAuthor')
  const authorLink = author.id ? `/members/${author.id}` : '#'

  useEffect(() => {
    if (!commentsOpen || comments.length > 0 || !onLoadComments) return undefined
    let alive = true
    ;(async () => {
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        const { comments: list, nextCursor } = await onLoadComments(post.id)
        if (alive) {
          setComments(list)
          setCommentsCursor(nextCursor)
        }
      } catch (err) {
        if (alive) setCommentsError(err.message || 'Error')
      } finally {
        if (alive) setCommentsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [commentsOpen, comments.length, onLoadComments, post.id])

  const handleDelete = async () => {
    if (!onDelete || deleting) return
    setDeleting(true)
    try {
      await onDelete(post.id)
    } catch {
      setDeleting(false)
    }
  }

  const handleAddComment = async ({ content }) => {
    const created = await onAddComment?.(post.id, { content })
    if (created) setComments((prev) => [...prev, created])
  }

  const handleDeleteComment = async (commentId) => {
    await onDeleteComment?.(post.id, commentId)
    setComments((prev) => prev.filter((c) => String(c.id) !== String(commentId)))
  }

  const loadMoreComments = async () => {
    if (!commentsCursor || commentsLoading) return
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const { comments: list, nextCursor } = await onLoadComments(post.id, {
        before: commentsCursor,
      })
      setComments((prev) => [...prev, ...list])
      setCommentsCursor(nextCursor)
    } catch (err) {
      setCommentsError(err.message || 'Error')
    } finally {
      setCommentsLoading(false)
    }
  }

  return (
    <li
      id={`activity-${post.id}`}
      className="activity-item bb-fade-in mb-5 list-none rounded-bb border border-bb-border bg-bb-content p-3 pb-2.5 text-[0.875rem] leading-normal shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover sm:p-[15px]"
    >
      <div className="bp-activity-head mb-3 flex gap-3">
        <div className="activity-avatar item-avatar shrink-0">
          <Link to={authorLink}>
            <Avatar name={authorName} src={author.avatarUrl} size="lg" />
          </Link>
        </div>
        <div className="activity-header min-w-0 flex-1">
          <div className="font-semibold text-bb-heading">
            <Link to={authorLink} className="hover:text-bb-primary">
              {authorName}
            </Link>
            {author.profession ? (
              <span className="ml-2 font-normal text-bb-sm text-bb-muted">{author.profession}</span>
            ) : null}
          </div>
          <p className="activity-date m-0 text-bb-sm text-bb-muted">
            <span className="time-since">{formatTimeSince(post.createdAt)}</span>
          </p>
        </div>

        {/* isOwnPost : champ serveur — ne pas recalculer via currentUser */}
        {post.isOwnPost ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="ml-auto shrink-0"
            disabled={deleting}
            onClick={handleDelete}
          >
            {t('common.delete')}
          </Button>
        ) : null}
      </div>

      {post.content ? (
        // Sûr UNIQUEMENT parce que le backend nettoie déjà le HTML via wp_kses (whitelist stricte).
        // Ne pas recopier dangerouslySetInnerHTML sur du contenu non validé côté serveur.
        <div
          className="activity-inner mb-3 text-bb-base text-bb-heading [&_a]:text-bb-primary [&_p]:m-0 [&_p+p]:mt-2"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : null}

      <FeedPostMedia media={post.media} />

      <ActivityState favoriteCount={post.likesCount} commentCount={post.commentsCount} />

      <ActivityActions
        favorited={post.viewerHasLiked}
        favoriteCount={post.likesCount}
        commentCount={post.commentsCount}
        commentsOpen={commentsOpen}
        onLike={() => onLike?.(post.id)}
        onToggleComments={() => setCommentsOpen((v) => !v)}
      />

      {commentsOpen && (
        <div className="activity-comments threaded-comments mt-3 border-t border-bb-border pt-3">
          <FeedCommentForm onSubmit={handleAddComment} />
          {commentsLoading && comments.length === 0 && (
            <p className="m-0 mt-2 text-bb-sm text-bb-muted">{t('common.loading')}</p>
          )}
          {commentsError && (
            <p className="m-0 mt-2 text-bb-sm text-bb-danger">{commentsError}</p>
          )}
          <ul className="activity-comments-list m-0 mt-3 list-none space-y-3 p-0">
            {comments.map((comment) => {
              const canDeleteComment =
                user?.id != null &&
                comment.author?.id != null &&
                String(comment.author.id) === String(user.id)
              return (
                <FeedCommentItem
                  key={comment.id}
                  comment={comment}
                  onDelete={
                    canDeleteComment ? () => handleDeleteComment(comment.id) : undefined
                  }
                />
              )
            })}
          </ul>
          {commentsCursor && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                disabled={commentsLoading}
                onClick={loadMoreComments}
              >
                {commentsLoading ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function FeedPostMedia({ media }) {
  const items = Array.isArray(media) ? media.filter((m) => m?.url) : []
  if (!items.length) return null

  const audios = items.filter((m) => m.type === 'audio')
  const images = items.filter((m) => m.type === 'image')

  if (audios.length) {
    const audio = audios[0]
    return (
      <div className="bb-activity-media-wrap mb-3 overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt p-3">
        <audio controls src={audio.url} className="w-full" preload="metadata" />
      </div>
    )
  }

  if (!images.length) return null

  const count = images.length
  return (
    <div
      className={`bb-activity-media-wrap mb-3 grid gap-1 overflow-hidden rounded-bb-inner ${
        count === 1 ? 'grid-cols-1' : 'grid-cols-2'
      }`}
    >
      {images.map((m, index) => (
        <img
          key={m.id || m.url || index}
          src={m.url}
          alt=""
          className={`w-full object-cover ${
            count === 1 ? 'max-h-[420px]' : 'aspect-square max-h-56 sm:max-h-72'
          }`}
        />
      ))}
    </div>
  )
}

function FeedCommentItem({ comment, onDelete }) {
  const author = comment.author || {}
  return (
    <li className="acomment flex gap-2.5">
      <Avatar name={author.displayName || '?'} src={author.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="acomment-content rounded-bb-inner bg-bb-alt px-3 py-2">
          <div className="mb-0.5 text-bb-sm font-semibold text-bb-heading">
            {author.displayName}
          </div>
          {/* Sûr UNIQUEMENT parce que le backend nettoie déjà le HTML via wp_kses (whitelist stricte). */}
          <div
            className="text-bb-sm text-bb-text [&_a]:text-bb-primary [&_p]:m-0"
            dangerouslySetInnerHTML={{ __html: comment.content || '' }}
          />
        </div>
        <div className="acomment-meta mt-1 flex items-center gap-3 pl-1 text-bb-xs text-bb-muted">
          <span className="posted">{formatTimeSince(comment.createdAt)}</span>
          {onDelete ? (
            <button
              type="button"
              className="min-h-[32px] px-1 font-medium text-bb-danger hover:underline"
              onClick={onDelete}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function FeedCommentForm({ onSubmit }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const currentUser = user || { displayName: 'Guest', avatar: null }

  const submit = async (e) => {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit({ content: value.trim() })
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
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('stories.feed.commentPlaceholder')}
          className="ac-input h-9 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
        />
        <Button type="submit" size="sm" disabled={!value.trim() || busy}>
          {t('common.publish')}
        </Button>
      </div>
    </form>
  )
}
