import { useCallback, useEffect, useRef, useState } from 'react'
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
import { isFeedScrolledToTop } from '../features/activity/feedScroll'
import { invalidate, invalidateMany, nudgeNotifications, QueryKeys } from '../lib/queryEvents'
import { useBackgroundSync } from '../lib/useBackgroundSync'

/** Intervalle de détection de nouvelles publications (onglet visible). */
const NEW_POSTS_POLL_MS = 12_000

/** Après un ignore, la bannière ne revient qu’à partir de ce nombre de posts plus récents. */
const DISMISS_RESHOW_AFTER = 5

function scopeId(value) {
  return value != null && value !== '' ? String(value) : null
}

/** Un événement createPost ne concerne ce fil que s’il matche groupe + auteur. */
function isSameFeedScope(detail, { authorId, groupId }) {
  if (scopeId(detail?.groupId) !== scopeId(groupId)) return false
  const localAuthor = scopeId(authorId)
  if (localAuthor && scopeId(detail?.authorId) !== localAuthor) return false
  return true
}

/** Fusionne la première page reçue sans effacer les publications plus anciennes déjà chargées. */
function mergeFeedHead(prev, chunk) {
  if (!chunk?.length) return []
  const sorted = sortPostsNewestFirst(chunk)
  const freshIds = new Set(sorted.map((p) => String(p.id)))
  const oldest = Math.min(...sorted.map((p) => Number(p.id)).filter(Number.isFinite))
  const older = prev.filter((p) => {
    if (freshIds.has(String(p.id))) return false
    const id = Number(p.id)
    return Number.isFinite(oldest) && Number.isFinite(id) && id < oldest
  })
  return sortPostsNewestFirst([...sorted, ...older])
}

/** Tri numérique décroissant — les ids string ("9" vs "10") cassent sinon l’ordre. */
function sortPostsNewestFirst(list) {
  return [...list].sort((a, b) => {
    const idDiff = Number(b?.id) - Number(a?.id)
    if (Number.isFinite(idDiff) && idDiff !== 0) return idDiff
    return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''))
  })
}

/** Publications présentes en tête du fetch mais pas encore dans le fil affiché. */
function countNewPostsAtHead(prev, chunk) {
  if (!chunk?.length || !prev?.length) return 0
  const prevIds = new Set(prev.map((p) => String(p.id)))
  let count = 0
  for (const p of chunk) {
    if (prevIds.has(String(p.id))) break
    count += 1
  }
  return count
}

/**
 * Hook Feed App API — pattern aligné sur `useMembers` (like optimiste + rollback).
 *
 * - Pagination curseur via `nextCursor` (pas de page=1,2,3)
 * - `isOwnPost` vient du serveur, jamais recalculé ici
 * - Option 1 : publication locale → prepend immédiat ; posts distants → bannière d’actualisation
 * - Ignore : masque la bannière ; réaffichage après 5 posts plus récents que le fil affiché
 */
export function useFeed({ perPage = 10, authorId, groupId, enabled = true } = {}) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [pendingNewCount, setPendingNewCount] = useState(0)
  const [refreshingPending, setRefreshingPending] = useState(false)

  const postsRef = useRef(posts)
  postsRef.current = posts
  const pendingRef = useRef(pendingNewCount)
  pendingRef.current = pendingNewCount
  const loadGenRef = useRef(0)
  const unseenCountRef = useRef(0)
  const showThresholdRef = useRef(1)

  const resetUnseen = useCallback(() => {
    unseenCountRef.current = 0
    showThresholdRef.current = 1
    setPendingNewCount(0)
  }, [])

  const noteUnseenCount = useCallback((count) => {
    const next = Math.max(0, Number(count) || 0)
    unseenCountRef.current = next
    if (next >= showThresholdRef.current) {
      setPendingNewCount(next)
    } else {
      setPendingNewCount(0)
    }
  }, [])

  const load = useCallback(
    async ({ append = false, before = null, silent = false } = {}) => {
      if (!enabled) {
        setPosts([])
        setNextCursor(null)
        setHasMore(false)
        setLoading(false)
        setLoadingMore(false)
        setError(null)
        resetUnseen()
        return
      }

      const gen = ++loadGenRef.current

      if (append) setLoadingMore(true)
      else if (!silent) setLoading(true)
      if (!silent) setError(null)

      try {
        const { posts: chunk, nextCursor: cursor } = await fetchFeed({
          before: append ? before : undefined,
          perPage,
          authorId,
          groupId,
        })

        if (gen !== loadGenRef.current) return

        const sorted = sortPostsNewestFirst(chunk)
        setPosts((prev) => (append ? [...prev, ...sorted] : sorted))
        setNextCursor(cursor)
        setHasMore(Boolean(cursor))
        if (!append) resetUnseen()
        if (silent) setError(null)
      } catch (err) {
        if (gen !== loadGenRef.current) return
        if (silent) {
          /* garder l’UI actuelle — refresh arrière-plan échoué = no-op visible */
          return
        }
        setError(err.message || 'Impossible de charger le fil')
        if (!append) {
          setPosts([])
          setNextCursor(null)
          setHasMore(false)
        }
      } finally {
        if (gen !== loadGenRef.current) return
        if (append) setLoadingMore(false)
        else if (!silent) setLoading(false)
        else setLoading(false)
      }
    },
    [perPage, authorId, groupId, enabled, resetUnseen],
  )

  useEffect(() => {
    load({ append: false })
  }, [load])

  const silentReload = useCallback(async () => {
    if (!enabled) return
    if (!postsRef.current.length) return load({ append: false, silent: true })
    try {
      const windowSize = Math.min(50, Math.max(postsRef.current.length, perPage))
      const prev = postsRef.current
      const { posts: chunk } = await fetchFeed({ perPage: windowSize, authorId, groupId })
      const sorted = sortPostsNewestFirst(chunk || [])
      const newAtHead = countNewPostsAtHead(prev, sorted)
      const atTop = isFeedScrolledToTop()

      if (newAtHead > 0 && !atTop) {
        noteUnseenCount(unseenCountRef.current + newAtHead)
      } else if (atTop) {
        resetUnseen()
      }

      setPosts((prevPosts) => mergeFeedHead(prevPosts, sorted))
    } catch {
      /* garder le fil déjà affiché */
    }
  }, [enabled, load, perPage, authorId, groupId, resetUnseen, noteUnseenCount])

  /**
   * Sync arrière-plan :
   * - createPost hors périmètre (autre groupe / autre auteur) → no-op
   * - createPost déjà présent localement (notre publish) → no-op
   * - createPost distant du même fil → fusion silencieuse, sans bandeau
   * - deletePost du même fil → retrait local immédiat (SSE / autre instance)
   * - deleteAccount → retrait des posts de cet auteur dans le fil courant
   * - autres mutations → reload silencieux
   */
  const onFeedSync = useCallback(
    (detail) => {
      if (detail?.reason === 'createPost') {
        if (!isSameFeedScope(detail, { authorId, groupId })) return

        const id = detail?.postId
        if (id && postsRef.current.some((p) => String(p.id) === String(id))) {
          return
        }
        return silentReload()
      }
      if (detail?.reason === 'deletePost') {
        if (!isSameFeedScope(detail, { authorId, groupId })) return
        const id = detail?.postId
        if (!id) return
        setPosts((prev) => prev.filter((p) => String(p.id) !== String(id)))
        return
      }
      if (detail?.reason === 'deleteAccount' && detail.authorId) {
        const removedAuthor = String(detail.authorId)
        setPosts((prev) =>
          prev.filter((p) => String(p.author?.id || p.authorId || '') !== removedAuthor),
        )
        return
      }
      if (detail?.reason === 'deleteGroup' && detail.groupId) {
        if (scopeId(groupId) && scopeId(detail.groupId) === scopeId(groupId)) {
          setPosts([])
        } else if (!groupId) {
          setPosts((prev) => prev.filter((p) => String(p.groupId || '') !== String(detail.groupId)))
        }
        return
      }
      return silentReload()
    },
    [silentReload, authorId, groupId],
  )

  useBackgroundSync(QueryKeys.feed, onFeedSync, { enabled, focus: false })

  const checkNewPosts = useCallback(async () => {
    if (!enabled || document.visibilityState !== 'visible') return

    return silentReload()
  }, [enabled, silentReload])

  useEffect(() => {
    if (!enabled) return undefined

    const tick = () => {
      Promise.resolve(checkNewPosts()).catch(() => {})
    }

    const id = window.setInterval(tick, NEW_POSTS_POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled, checkNewPosts])

  const applyPendingRefresh = useCallback(async () => {
    setRefreshingPending(true)
    try {
      await load({ append: false, silent: true })
      resetUnseen()
    } finally {
      setRefreshingPending(false)
    }
  }, [load, resetUnseen])

  const dismissPending = useCallback(() => {
    setPendingNewCount(0)
    showThresholdRef.current = DISMISS_RESHOW_AFTER
  }, [])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return
    load({ append: true, before: nextCursor })
  }, [hasMore, loadingMore, nextCursor, load])

  const createPost = useCallback(
    async ({ content, media, onProgress } = {}) => {
      setActionError(null)
      try {
        const created = await apiCreatePost({ content, media, groupId, onProgress })
        /* Option 1 : prepend immédiat — pas de bannière sur cette instance */
        if (created) {
          setPosts((prev) =>
            sortPostsNewestFirst([
              created,
              ...prev.filter((p) => String(p.id) !== String(created.id)),
            ]),
          )
          resetUnseen()
        }
        invalidateMany([QueryKeys.feed, QueryKeys.members], {
          reason: 'createPost',
          postId: created?.id,
          groupId,
          authorId: created?.author?.id,
        })
        return created
      } catch (err) {
        setActionError(err.message || 'Impossible de publier')
        throw err
      }
    },
    [groupId, resetUnseen],
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
        invalidate(QueryKeys.feed, { reason: 'like', postId: id })
        if (!wasLiked) nudgeNotifications({ reason: 'like', postId: id })
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
      invalidateMany([QueryKeys.feed, QueryKeys.members], {
        reason: 'deletePost',
        postId: id,
        authorId: snapshot.find((p) => String(p.id) === String(id))?.author?.id,
      })
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

  const addComment = useCallback(async (postId, { content, parentId } = {}) => {
    setActionError(null)
    try {
      const comment = await apiCreateComment(postId, { content, parentId })
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
            : p,
        ),
      )
      invalidate(QueryKeys.feed, { reason: 'comment', postId })
      nudgeNotifications({ reason: 'comment', postId })
      return comment
    } catch (err) {
      setActionError(err.message || 'Impossible d’ajouter le commentaire')
      throw err
    }
  }, [])

  const removeComment = useCallback(async (postId, commentId, { removedCount = 1 } = {}) => {
    setActionError(null)
    try {
      await apiDeleteComment(commentId)
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - removedCount) }
            : p,
        ),
      )
      invalidate(QueryKeys.feed, { reason: 'removeComment', postId, commentId })
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
    pendingNewCount,
    refreshingPending,
    applyPendingRefresh,
    dismissPending,
    resetNewActivityBanner: resetUnseen,
    reload: () => load({ append: false }),
    silentReload,
  }
}
