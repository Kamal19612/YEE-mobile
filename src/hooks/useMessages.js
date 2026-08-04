import { useCallback, useEffect, useMemo, useState } from 'react'
import { createThread as apiCreateThread, fetchThreads, sendMessage as apiSend } from '../api/messages'
import { USE_MOCK } from '../config/api'
import { demoThreads } from '../data/messagesData'
import { useAuth } from './useAuth'

export function useMessages(activeThreadId) {
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest' }
  const [threads, setThreads] = useState([])
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
          if (alive) setThreads(demoThreads)
        } else {
          const list = await fetchThreads()
          if (alive) setThreads(list)
        }
      } catch (err) {
        if (alive) setError(err.message || 'Failed to load messages')
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
    [currentUser],
  )

  const unreadCount = useMemo(() => threads.filter((t) => t.unread).length, [threads])

  const createThread = useCallback(
    async ({ participantName, subject, firstMessage, recipientIds = [] }) => {
      if (!USE_MOCK) {
        const created = await apiCreateThread({
          recipients: recipientIds.length ? recipientIds : undefined,
          subject: subject || `Conversation avec ${participantName}`,
          content: firstMessage || '',
        })
        const mapped = created?.id
          ? created
          : {
              id: Date.now(),
              subject: subject || `Conversation avec ${participantName}`,
              participants: [{ id: Date.now() + 1, displayName: participantName, avatar: null }],
              unread: false,
              updatedAt: new Date().toISOString(),
              messages: [],
            }
        setThreads((prev) => [mapped, ...prev])
        return mapped
      }

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
    },
    [currentUser],
  )

  return { threads, activeThread, loading, error, sendMessage, unreadCount, createThread }
}
