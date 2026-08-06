import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createReply as apiReply,
  createTopic as apiTopic,
  fetchForums,
  fetchReplies,
  fetchTopic,
  fetchTopics,
} from '../api/forums'

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
        if (alive) setForums(await fetchForums())
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load forums')
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
        const list = await fetchTopics(forumId)
        if (!alive) return
        setForum({ id: forumId })
        setTopics(list)
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
      const topic = await apiTopic({ forumId, title, content })
      setTopics((prev) => [topic, ...prev])
      return topic
    },
    [forumId],
  )

  return { forum, topics, loading, error, createTopic }
}

export function useTopic(topicId) {
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
        const [t, r] = await Promise.all([fetchTopic(topicId), fetchReplies(topicId)])
        if (!alive) return
        setTopic(t)
        setReplies(r)
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
      const reply = await apiReply({ topicId, content, parentId })

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
    [topicId],
  )

  const forum = useMemo(() => {
    if (!topic) return null
    return { id: topic.forumId }
  }, [topic])

  return { topic, forum, replies, loading, error, addReply }
}
