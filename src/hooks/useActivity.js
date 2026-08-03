import { useCallback, useEffect, useState } from 'react'
import {
  createActivity as apiCreate,
  favoriteActivity as apiFavorite,
  fetchActivities,
  postComment as apiComment,
} from '../api/activity'
import { demoActivities } from '../data/activityData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function filterMock(list, scope) {
  if (scope === 'just-me') return list.filter((a) => a.userId === 1)
  if (scope === 'mentions') return list.filter((a) => a.content.includes('@'))
  if (scope === 'favorites') return list.filter((a) => a.favorited)
  if (scope === 'groups') return list.filter((a) => a.component === 'groups')
  if (scope === 'following') return list.filter((a) => [2, 4].includes(a.userId))
  return list
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
          setError(err.message || 'Failed to load activity')
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

  const createPost = useCallback(async ({ content, privacy = 'public', poll, media }) => {
    if (USE_MOCK) {
      const post = {
        id: Date.now(),
        userId: 1,
        userName: 'Alex Martin',
        userLink: '#',
        avatar: null,
        content,
        date: new Date().toISOString(),
        component: 'activity',
        type: 'activity_update',
        privacy,
        favorited: false,
        favoriteCount: 0,
        commentCount: 0,
        edited: false,
        group: null,
        media: media || [],
        poll: poll || null,
        comments: [],
      }
      setActivities((prev) => [post, ...prev])
      return post
    }
    const post = await apiCreate({ content, privacy })
    setActivities((prev) => [post, ...prev])
    return post
  }, [])

  const toggleFavorite = useCallback(async (id) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              favorited: !a.favorited,
              favoriteCount: a.favorited ? Math.max(0, a.favoriteCount - 1) : a.favoriteCount + 1,
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
  }, [activities, load])

  const addComment = useCallback(async (activityId, { content, parentId = 0 }) => {
    const comment = USE_MOCK
      ? {
          id: Date.now(),
          userId: 1,
          userName: 'Alex Martin',
          avatar: null,
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

  const votePoll = useCallback((activityId, optionId) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId || !a.poll || a.poll.votedOptionId) return a
        return {
          ...a,
          poll: {
            ...a.poll,
            votedOptionId: optionId,
            totalVotes: a.poll.totalVotes + 1,
            options: a.poll.options.map((o) =>
              o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
            ),
          },
        }
      }),
    )
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
    votePoll,
    reload: () => load(1),
  }
}
