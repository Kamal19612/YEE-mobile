import { useCallback, useEffect, useMemo, useState } from 'react'
import { createReply as apiReply, createTopic as apiTopic, fetchForums } from '../api/forums'
import { currentUser } from '../data/demoData'
import { demoForums, demoReplies, demoTopics } from '../data/forumsData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export function useForums(search = '') {
  const [forums, setForums] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 250))
          if (alive) setForums(demoForums)
        } else {
          if (alive) setForums(await fetchForums())
        }
      } catch {
        if (alive) setForums(demoForums)
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

  return { forums: visible, loading }
}

export function useForum(forumId) {
  const forum = useMemo(
    () => demoForums.find((f) => String(f.id) === String(forumId)) || null,
    [forumId],
  )
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      await new Promise((r) => setTimeout(r, 200))
      if (alive) {
        setTopics(
          demoTopics
            .filter((t) => String(t.forumId) === String(forumId))
            .sort((a, b) => Number(b.sticky) - Number(a.sticky) || new Date(b.lastReplyAt) - new Date(a.lastReplyAt)),
        )
        setLoading(false)
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
    [forumId],
  )

  return { forum, topics, loading, createTopic }
}

export function useTopic(topicId) {
  const topicMeta = useMemo(
    () => demoTopics.find((t) => String(t.id) === String(topicId)) || null,
    [topicId],
  )
  const [topic, setTopic] = useState(topicMeta)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTopic(topicMeta)
    let alive = true
    async function run() {
      setLoading(true)
      await new Promise((r) => setTimeout(r, 200))
      if (alive) {
        setReplies(demoReplies.filter((r) => String(r.topicId) === String(topicId)))
        setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [topicId, topicMeta])

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
    [topicId],
  )

  const forum = useMemo(
    () => (topic ? demoForums.find((f) => f.id === topic.forumId) : null),
    [topic],
  )

  return { topic, forum, replies, loading, addReply }
}
