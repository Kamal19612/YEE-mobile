import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  createComment as apiCreateComment,
  deleteComment as apiDeleteComment,
  deletePost as apiDeletePost,
  fetchComments as apiFetchComments,
  fetchPost,
  likePost,
  unlikePost,
} from '../../api/feed'
import { invalidate, invalidateMany, nudgeNotifications, QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'
import { FeedPostCard } from './FeedPostCard'
import { ActivityPlaceholder } from './ActivityPlaceholder'

/** Page détail d’un post — cible des notifications post_like / post_comment. */
export function FeedPostPage() {
  const { postId } = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const focusCommentId = searchParams.get('comment')
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!postId) return
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        const data = await fetchPost(postId)
        setPost(data)
        if (silent) setError(null)
      } catch (err) {
        const gone = err.status === 404 || err.code === 'not_found'
        if (silent && !gone) return
        setPost(null)
        setError(err.message || t('stories.empty'))
      } finally {
        if (!silent) setLoading(false)
        else setLoading(false)
      }
    },
    [postId, t],
  )

  useEffect(() => {
    load({ silent: false })
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onFeedSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deletePost' && String(detail.postId) === String(postId)) {
        setPost(null)
        setError(t('stories.empty'))
        return
      }
      if (detail?.reason === 'deleteAccount' && detail.authorId) {
        setPost((current) => {
          if (current && String(current.author?.id || current.authorId || '') === String(detail.authorId)) {
            setError(t('stories.empty'))
            return null
          }
          return current
        })
        return
      }
      return silentReload()
    },
    [postId, silentReload, t],
  )
  useBackgroundSync(QueryKeys.feed, onFeedSync, { enabled: Boolean(postId) })

  const toggleLike = useCallback(
    async (id) => {
      if (!post || String(post.id) !== String(id)) return
      const wasLiked = Boolean(post.viewerHasLiked)
      const snapshot = post

      setPost({
        ...post,
        viewerHasLiked: !wasLiked,
        likesCount: wasLiked
          ? Math.max(0, (post.likesCount || 0) - 1)
          : (post.likesCount || 0) + 1,
      })

      try {
        if (wasLiked) await unlikePost(id)
        else await likePost(id)
        invalidate(QueryKeys.feed, { reason: 'like', postId: id })
        if (!wasLiked) nudgeNotifications({ reason: 'like', postId: id })
      } catch {
        setPost(snapshot)
      }
    },
    [post],
  )

  const deletePost = useCallback(
    async (id) => {
      await apiDeletePost(id)
      invalidateMany([QueryKeys.feed, QueryKeys.members], {
        reason: 'deletePost',
        postId: id,
        authorId: post?.author?.id,
      })
      navigate('/', { replace: true })
    },
    [navigate, post?.author?.id],
  )

  const loadComments = useCallback(async (id, { before } = {}) => {
    return apiFetchComments(id, { before })
  }, [])

  const addComment = useCallback(async (id, { content, parentId } = {}) => {
    const comment = await apiCreateComment(id, { content, parentId })
    setPost((current) =>
      current && String(current.id) === String(id)
        ? { ...current, commentsCount: (current.commentsCount || 0) + 1 }
        : current,
    )
    invalidate(QueryKeys.feed, { reason: 'comment', postId: id })
    nudgeNotifications({ reason: 'comment', postId: id })
    return comment
  }, [])

  const removeComment = useCallback(async (id, commentId, { removedCount = 1 } = {}) => {
    await apiDeleteComment(commentId)
    setPost((current) =>
      current && String(current.id) === String(id)
        ? { ...current, commentsCount: Math.max(0, (current.commentsCount || 0) - removedCount) }
        : current,
    )
    invalidate(QueryKeys.feed, { reason: 'removeComment', postId: id, commentId })
  }, [])

  return (
    <div className="buddypress-wrap w-full max-w-content">
      <div className="mb-4">
        <Link to="/" className="text-bb-sm text-bb-primary no-underline hover:underline">
          ← {t('common.back')}
        </Link>
      </div>

      {loading && <ActivityPlaceholder />}

      {!loading && error && (
        <div className="bb-card mb-5 p-4 text-bb-sm text-bb-danger">{error}</div>
      )}

      {!loading && !error && post && (
        <ul className="activity-list bp-list item-list m-0 list-none p-0">
          <FeedPostCard
            post={post}
            onLike={toggleLike}
            onDelete={deletePost}
            onLoadComments={loadComments}
            onAddComment={addComment}
            onDeleteComment={removeComment}
            initialCommentsOpen
            focusCommentId={focusCommentId}
          />
        </ul>
      )}
    </div>
  )
}
