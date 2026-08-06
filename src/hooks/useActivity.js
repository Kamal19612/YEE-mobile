import { useCallback, useEffect, useState } from 'react'
import {
  createFeedItem,
  favoriteActivity as apiFavorite,
  getFeedItems,
  postComment as apiComment,
} from '../api/storiesFeed'
import { PUBLICATION_STATUS } from '../data/activityData'
import { mapWithSessionMedia } from '../utils/sessionMedia'
import { useAuth } from './useAuth'

export function useActivity({ scope = 'all', perPage = 10 } = {}) {
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest', avatar: null }
  const userId = currentUser.id

  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const load = useCallback(
    async (nextPage = 1, { append = false } = {}) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)

      try {
        const filtres = {
          page: nextPage,
          perPage,
          scope,
        }
        if (scope === 'just-me' || scope === 'pending') {
          filtres.author = userId
        }
        if (scope === 'pending') filtres.status = 'pending'

        let list = await getFeedItems(filtres)
        if (scope === 'favorites') list = list.filter((a) => a.favorited)
        if (scope === 'groups') list = list.filter((a) => a.component === 'groups')

        const patched = mapWithSessionMedia(list, currentUser, { idKey: 'userId' })
        setActivities((prev) => (append ? [...prev, ...patched] : patched))
        setHasMore(list.length >= perPage)
        setPage(nextPage)
      } catch (err) {
        setError(err.message || 'Impossible de charger les actualités')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [scope, perPage, userId, currentUser],
  )

  useEffect(() => {
    load(1)
  }, [load])

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return
    load(page + 1, { append: true })
  }, [hasMore, loadingMore, load, page])

  const createPost = useCallback(
    async ({
      title = '',
      content,
      media,
      tags,
      consent = false,
      anonymous = false,
      status = PUBLICATION_STATUS.PENDING,
    }) => {
      const created = await createFeedItem({
        content,
        title,
        status,
        consent,
        anonymous,
        tags,
        media,
        mediaType: media?.[0]?.type || '',
      })
      setActivities((prev) => [created, ...prev])
      return created
    },
    [],
  )

  const toggleFavorite = useCallback(
    async (id) => {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                favorited: !a.favorited,
                favoriteCount: a.favorited
                  ? Math.max(0, a.favoriteCount - 1)
                  : a.favoriteCount + 1,
              }
            : a,
        ),
      )
      const current = activities.find((a) => a.id === id)
      try {
        await apiFavorite(id, { favorited: current?.favorited })
      } catch {
        load(1)
      }
    },
    [activities, load],
  )

  const addComment = useCallback(
    async (activityId, { content, parentId = 0 }) => {
      const comment = await apiComment(activityId, { content, parentId })

      setActivities((prev) =>
        prev.map((a) => {
          if (a.id !== activityId) return a
          if (!parentId) {
            return {
              ...a,
              commentCount: a.commentCount + 1,
              comments: [...(a.comments || []), comment],
            }
          }
          const nest = (list) =>
            list.map((c) =>
              c.id === parentId
                ? { ...c, children: [...(c.children || []), comment] }
                : { ...c, children: nest(c.children || []) },
            )
          return {
            ...a,
            commentCount: a.commentCount + 1,
            comments: nest(a.comments || []),
          }
        }),
      )
      return comment
    },
    [],
  )

  return {
    activities,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    createPost,
    toggleFavorite,
    addComment,
    reload: () => load(1),
  }
}
