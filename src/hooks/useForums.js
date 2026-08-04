import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createReply as apiReply,
  createTopic as apiTopic,
  fetchForums,
  fetchReplies,
  fetchTopic,
  fetchTopics,
} from '../api/forums'
import { USE_MOCK } from '../config/api'
import { demoForums, demoReplies, demoTopics } from '../data/forumsData'
import { useAuth } from './useAuth'

export function useForums(search = '') {
  const [forums, setForums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 250))
          if (alive) setForums(demoForums)
        } else if (alive) {
          setForums(await fetchForums())
        }
      } catch (err) {
        if (alive) {
          setError(err.message || 'Failed to load forums')
          if (USE_MOCK) setForums(demoForums)
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return forums
    return forums.filter(
      (f) => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    )
  }, [forums, search])

  return { forums: visible, loading, error }
}

export function useForum(forumId) {
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest' }
  const [forum, setForum] = useState(null)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 200))
          if (!alive) return
          setForum(demoForums.find((f) => String(f.id) === String(forumId)) || null)
          setTopics(
            demoTopics
              .filter((t) => String(t.forumId) === String(forumId))
              .sort(
                (a, b) =>
                  Number(b.sticky) - Number(a.sticky) ||
                  new Date(b.lastReplyAt) - new Date(a.lastReplyAt),
              ),
          )
        } else {
          const list = await fetchTopics(forumId)
          if (!alive) return
          setForum(demoForums.find((f) => String(f.id) === String(forumId)) || { id: forumId })
          setTopics(list)
        }
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load forum')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [forumId])

  const createTopic = useCallback(
    async ({ title, content }) => {
      const topic = USE_MOCK
        ? {
            id: Date.now(),
            forumId: Number(forumId),
            title,
            content,
            authorId: currentUser.id,
            authorName: currentUser.displayName,
            date: new Date().toISOString(),
            replyCount: 0,
            voiceCount: 1,
            sticky: false,
            closed: false,
            lastReplyAt: new Date().toISOString(),
            lastReplyAuthor: currentUser.displayName,
          }
        : await apiTopic({ forumId, title, content })
      setTopics((prev) => [topic, ...prev])
      return topic
    },
    [forumId, currentUser],
  )

  return { forum, topics, loading, error, createTopic }
}

export function useTopic(topicId) {
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest' }
  const [topic, setTopic] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 200))
          if (!alive) return
          setTopic(demoTopics.find((t) => String(t.id) === String(topicId)) || null)
          setReplies(demoReplies.filter((r) => String(r.topicId) === String(topicId)))
        } else {
          const [t, r] = await Promise.all([fetchTopic(topicId), fetchReplies(topicId)])
          if (!alive) return
          setTopic(t)
          setReplies(r)
        }
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load topic')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [topicId])

  const addReply = useCallback(
    async ({ content, parentId = 0 }) => {
      const reply = USE_MOCK
        ? {
            id: Date.now(),
            topicId: Number(topicId),
            authorId: currentUser.id,
            authorName: currentUser.displayName,
            content,
            date: new Date().toISOString(),
            parentId,
          }
        : await apiReply({ topicId, content, parentId })

      setReplies((prev) => [...prev, reply])
      setTopic((prev) =>
        prev
          ? {
              ...prev,
              replyCount: prev.replyCount + 1,
              lastReplyAt: reply.date,
              lastReplyAuthor: reply.authorName,
            }
          : prev,
      )
      return reply
    },
    [topicId, currentUser],
  )

  const forum = useMemo(() => {
    if (!topic) return null
    if (USE_MOCK) return demoForums.find((f) => f.id === topic.forumId) || null
    return { id: topic.forumId }
  }, [topic])

  return { topic, forum, replies, loading, error, addReply }
}
