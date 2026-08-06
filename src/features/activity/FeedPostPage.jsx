import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { FeedPostCard } from './FeedPostCard'
import { ActivityPlaceholder } from './ActivityPlaceholder'

/** Page détail d’un post — cible des notifications post_like / post_comment. */
export function FeedPostPage() {
  const { postId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPost(postId)
        if (alive) setPost(data)
      } catch (err) {
        if (alive) {
          setPost(null)
          setError(err.message || t('stories.empty'))
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [postId, t])

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
      } catch {
        setPost(snapshot)
      }
    },
    [post],
  )

  const deletePost = useCallback(
    async (id) => {
      await apiDeletePost(id)
      navigate('/', { replace: true })
    },
    [navigate],
  )

  const loadComments = useCallback(async (id, { before } = {}) => {
    return apiFetchComments(id, { before })
  }, [])

  const addComment = useCallback(async (id, { content }) => {
    const comment = await apiCreateComment(id, { content })
    setPost((current) =>
      current && String(current.id) === String(id)
        ? { ...current, commentsCount: (current.commentsCount || 0) + 1 }
        : current,
    )
    return comment
  }, [])

  const removeComment = useCallback(async (id, commentId) => {
    await apiDeleteComment(commentId)
    setPost((current) =>
      current && String(current.id) === String(id)
        ? { ...current, commentsCount: Math.max(0, (current.commentsCount || 0) - 1) }
        : current,
    )
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
          />
        </ul>
      )}
    </div>
  )
}
