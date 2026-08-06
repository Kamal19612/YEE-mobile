import { useCallback, useEffect, useState } from 'react'
import {
  createComment as apiCreateComment,
  createPost as apiCreatePost,
  deleteComment as apiDeleteComment,
  deletePost as apiDeletePost,
  fetchComments as apiFetchComments,
  fetchFeed,
  likePost,
  unlikePost,
} from '../api/feed'

/**
 * Hook Feed App API — pattern aligné sur `useMembers` (like optimiste + rollback).
 *
 * - Pagination curseur via `nextCursor` (pas de page=1,2,3)
 * - `isOwnPost` vient du serveur, jamais recalculé ici
 * - Pas de fallback silencieux qui masque une erreur backend
 */
export function useFeed({ perPage = 10, authorId } = {}) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)

  const load = useCallback(
    async ({ append = false, before = null } = {}) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const { posts: chunk, nextCursor: cursor } = await fetchFeed({
          before: append ? before : undefined,
          perPage,
          authorId,
        })

        setPosts((prev) => (append ? [...prev, ...chunk] : chunk))
        setNextCursor(cursor)
        setHasMore(Boolean(cursor))
      } catch (err) {
        setError(err.message || 'Impossible de charger le fil')
        if (!append) {
          setPosts([])
          setNextCursor(null)
          setHasMore(false)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [perPage, authorId],
  )

  useEffect(() => {
    load({ append: false })
  }, [load])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return
    load({ append: true, before: nextCursor })
  }, [hasMore, loadingMore, nextCursor, load])

  const createPost = useCallback(
    async ({ content, media } = {}) => {
      setActionError(null)
      try {
        const created = await apiCreatePost({ content, media })
        setPosts((prev) => [created, ...prev])
        return created
      } catch (err) {
        setActionError(err.message || 'Impossible de publier')
        throw err
      }
    },
    [],
  )

  /**
   * Like/unlike optimiste avec rollback strict (calqué sur toggleFriend / useMembers).
   */
  const toggleLike = useCallback(
    async (id) => {
      setActionError(null)
      const target = posts.find((p) => String(p.id) === String(id))
      if (!target) return

      const wasLiked = Boolean(target.viewerHasLiked)
      const snapshot = posts

      setPosts((prev) =>
        prev.map((p) => {
          if (String(p.id) !== String(id)) return p
          return {
            ...p,
            viewerHasLiked: !wasLiked,
            likesCount: wasLiked
              ? Math.max(0, (p.likesCount || 0) - 1)
              : (p.likesCount || 0) + 1,
          }
        }),
      )

      try {
        if (wasLiked) await unlikePost(id)
        else await likePost(id)
      } catch (err) {
        setPosts(snapshot)
        setActionError(err.message || 'Impossible de mettre à jour le like')
      }
    },
    [posts],
  )

  const deletePost = useCallback(async (id) => {
    setActionError(null)
    const snapshot = posts

    setPosts((prev) => prev.filter((p) => String(p.id) !== String(id)))

    try {
      await apiDeletePost(id)
    } catch (err) {
      setPosts(snapshot)
      setActionError(err.message || 'Impossible de supprimer le post')
      throw err
    }
  }, [posts])

  const loadComments = useCallback(async (postId, { before } = {}) => {
    setActionError(null)
    try {
      return await apiFetchComments(postId, { before })
    } catch (err) {
      setActionError(err.message || 'Impossible de charger les commentaires')
      throw err
    }
  }, [])

  const addComment = useCallback(async (postId, { content }) => {
    setActionError(null)
    try {
      const comment = await apiCreateComment(postId, { content })
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
            : p,
        ),
      )
      return comment
    } catch (err) {
      setActionError(err.message || 'Impossible d’ajouter le commentaire')
      throw err
    }
  }, [])

  const removeComment = useCallback(async (postId, commentId) => {
    setActionError(null)
    try {
      await apiDeleteComment(commentId)
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) }
            : p,
        ),
      )
    } catch (err) {
      setActionError(err.message || 'Impossible de supprimer le commentaire')
      throw err
    }
  }, [])

  return {
    posts,
    loading,
    loadingMore,
    error: error || actionError,
    hasMore,
    nextCursor,
    loadMore,
    createPost,
    toggleLike,
    deletePost,
    loadComments,
    addComment,
    removeComment,
    reload: () => load({ append: false }),
  }
}
