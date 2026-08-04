import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchThreads, sendMessage as apiSend } from '../api/messages'
import { currentUser } from '../data/demoData'
import { demoThreads } from '../data/messagesData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export function useMessages(activeThreadId) {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 250))
          if (alive) setThreads(demoThreads)
        } else {
          const list = await fetchThreads()
          if (alive) setThreads(list)
        }
      } catch (err) {
        if (alive) {
          setThreads(demoThreads)
          setError(err.message)
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

  const activeThread = useMemo(
    () => threads.find((t) => String(t.id) === String(activeThreadId)) || null,
    [threads, activeThreadId],
  )

  useEffect(() => {
    if (!activeThreadId) return
    setThreads((prev) =>
      prev.map((t) => (String(t.id) === String(activeThreadId) ? { ...t, unread: false } : t)),
    )
  }, [activeThreadId])

  const sendMessage = useCallback(
    async (threadId, content) => {
      const message = {
        id: Date.now(),
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content,
        date: new Date().toISOString(),
      }
      setThreads((prev) =>
        prev
          .map((t) =>
            String(t.id) === String(threadId)
              ? {
                  ...t,
                  unread: false,
                  updatedAt: message.date,
                  messages: [...t.messages, message],
                }
              : t,
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      )
      if (!USE_MOCK) {
        try {
          await apiSend(threadId, content)
        } catch {
          /* keep optimistic */
        }
      }
      return message
    },
    [],
  )

  const unreadCount = useMemo(() => threads.filter((t) => t.unread).length, [threads])

  const createThread = useCallback(async ({ participantName, subject, firstMessage }) => {
    const id = Date.now()
    const thread = {
      id,
      subject: subject || `Conversation avec ${participantName}`,
      participants: [{ id: Date.now() + 1, displayName: participantName, avatar: null }],
      unread: false,
      updatedAt: new Date().toISOString(),
      messages: firstMessage
        ? [
            {
              id: Date.now() + 2,
              senderId: currentUser.id,
              senderName: currentUser.displayName,
              content: firstMessage,
              date: new Date().toISOString(),
            },
          ]
        : [],
    }
    setThreads((prev) => [thread, ...prev])
    demoThreads.unshift(thread)
    return thread
  }, [])

  return { threads, activeThread, loading, error, sendMessage, unreadCount, createThread }
}
