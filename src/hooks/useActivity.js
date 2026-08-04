import { useCallback, useEffect, useState } from 'react'
import {
  createActivity as apiCreate,
  favoriteActivity as apiFavorite,
  fetchActivities,
  postComment as apiComment,
} from '../api/activity'
import { currentUser } from '../data/demoData'
import { demoActivities, PUBLICATION_STATUS } from '../data/activityData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const CURRENT_USER_ID = currentUser.id

function filterMock(list, scope) {
  if (scope === 'just-me') return list.filter((a) => a.userId === CURRENT_USER_ID)
  if (scope === 'pending') {
    return list.filter(
      (a) => a.userId === CURRENT_USER_ID && a.status === PUBLICATION_STATUS.PENDING,
    )
  }
  if (scope === 'favorites') return list.filter((a) => a.favorited)
  if (scope === 'groups') return list.filter((a) => a.component === 'groups')
  // Fil public : uniquement les récits publiés
  return list.filter((a) => a.status === PUBLICATION_STATUS.PUBLISHED)
}

export function useActivity({ scope = 'all', perPage = 10 } = {}) {
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
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, append ? 400 : 500))
          const filtered = filterMock(demoActivities, scope)
          const start = (nextPage - 1) * perPage
          const chunk = filtered.slice(start, start + perPage)
          setActivities((prev) => (append ? [...prev, ...chunk] : chunk))
          setHasMore(start + chunk.length < filtered.length)
        } else {
          const list = await fetchActivities({ page: nextPage, perPage, scope })
          setActivities((prev) => (append ? [...prev, ...list] : list))
          setHasMore(list.length >= perPage)
        }
        setPage(nextPage)
      } catch (err) {
        if (!append && USE_MOCK) {
          setActivities(filterMock(demoActivities, scope))
          setHasMore(false)
        } else {
          setError(err.message || 'Failed to load stories')
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [scope, perPage],
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
      const post = {
        id: Date.now(),
        userId: CURRENT_USER_ID,
        userName: currentUser.displayName,
        userLink: `/members/${CURRENT_USER_ID}`,
        avatar: currentUser.avatar,
        anonymous,
        title,
        content,
        date: new Date().toISOString(),
        component: 'activity',
        type: 'story',
        privacy: 'public',
        status,
        consent,
        tags: tags || { country: '', thematic: '', language: '' },
        favorited: false,
        favoriteCount: 0,
        commentCount: 0,
        edited: false,
        group: null,
        media: media || [],
        comments: [],
      }

      if (USE_MOCK) {
        demoActivities.unshift(post)
        // Afficher immédiatement si le filtre courant le permet
        const visibleNow =
          (scope === 'all' && status === PUBLICATION_STATUS.PUBLISHED) ||
          (scope === 'just-me' && post.userId === CURRENT_USER_ID) ||
          (scope === 'pending' && status === PUBLICATION_STATUS.PENDING)
        if (visibleNow) {
          setActivities((prev) => [post, ...prev])
        }
        return post
      }

      const created = await apiCreate({
        content,
        title,
        privacy: 'public',
        status,
        consent,
        anonymous,
        tags,
        media,
      })
      setActivities((prev) => [created, ...prev])
      return created
    },
    [scope],
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
      if (!USE_MOCK) {
        const current = activities.find((a) => a.id === id)
        try {
          await apiFavorite(id, { favorited: current?.favorited })
        } catch {
          load(1)
        }
      }
    },
    [activities, load],
  )

  const addComment = useCallback(async (activityId, { content, parentId = 0 }) => {
    const comment = USE_MOCK
      ? {
          id: Date.now(),
          userId: CURRENT_USER_ID,
          userName: currentUser.displayName,
          avatar: currentUser.avatar,
          content,
          date: new Date().toISOString(),
          children: [],
        }
      : await apiComment(activityId, { content, parentId })

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
  }, [])

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
