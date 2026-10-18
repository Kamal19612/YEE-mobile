import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createThread as apiCreateThread,
  deleteConversation as apiDeleteConversation,
  deleteMessage as apiDeleteMessage,
  fetchMessages,
  fetchThreads,
  fetchUnreadCount,
  mapRealtimeCreatedMessage,
  markThreadRead,
  prefetchChatMedia,
  sendMessage as apiSend,
  sendTyping,
} from '../api/messages'
import { invalidate, QueryKeys, subscribe } from '../lib/queryEvents'
import { subscribeMessageRealtime } from '../lib/messageRealtime'
import { useBackgroundSync } from '../lib/useBackgroundSync'
import { useAuth } from './useAuth'

const unreadListeners = new Set()
let sharedUnread = 0
let unreadPoll = null
let unreadMounts = 0

function publishUnread(count) {
  sharedUnread = Math.max(0, Number(count) || 0)
  unreadListeners.forEach((fn) => {
    try {
      fn(sharedUnread)
    } catch {
      /* ignore */
    }
  })
}

async function pollUnread() {
  try {
    publishUnread(await fetchUnreadCount())
  } catch {
    /* keep last */
  }
}

export function useMessageUnreadCount() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [count, setCount] = useState(sharedUnread)

  useEffect(() => {
    const onChange = (n) => setCount(n)
    unreadListeners.add(onChange)
    setCount(sharedUnread)
    return () => unreadListeners.delete(onChange)
  }, [])

  useEffect(() => {
    if (isBootstrapping) return undefined
    if (!isAuthenticated) {
      publishUnread(0)
      return undefined
    }
    unreadMounts += 1
    pollUnread()
    if (!unreadPoll) unreadPoll = setInterval(pollUnread, 15_000)
    return () => {
      unreadMounts = Math.max(0, unreadMounts - 1)
      if (unreadMounts === 0 && unreadPoll) {
        clearInterval(unreadPoll)
        unreadPoll = null
      }
    }
  }, [isAuthenticated, isBootstrapping])

  return count
}

export function applyMessageUnread(count) {
  if (typeof count === 'number') publishUnread(count)
  else pollUnread()
}

export function useMessages(activeThreadId) {
  const { user } = useAuth()
  const [threads, setThreads] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [olderPage, setOlderPage] = useState(1)
  const [error, setError] = useState(null)
  const [typingUserId, setTypingUserId] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      const { threads: list } = await fetchThreads()
      setThreads(list)
      if (silent) setError(null)
    } catch (err) {
      if (silent) return
      setError(err.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load({ silent: false })
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  useBackgroundSync(QueryKeys.messages, silentReload)

  useEffect(() => {
    return subscribe(QueryKeys.messages, () => {
      silentReload()
    })
  }, [silentReload])

  const activeThread = useMemo(
    () => threads.find((t) => String(t.id) === String(activeThreadId)) || null,
    [threads, activeThreadId],
  )

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([])
      setHasOlder(false)
      setOlderPage(1)
      return undefined
    }
    let cancelled = false
    setLoadingMessages(true)
    fetchMessages(activeThreadId, { page: 1, perPage: 30 })
      .then(({ messages: list, meta }) => {
        if (cancelled) return
        setMessages(list)
        setHasOlder(Boolean(meta.hasNext))
        setOlderPage(1)
        prefetchChatMedia(list)
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false)
      })

    markThreadRead(activeThreadId)
      .then(() => {
        setThreads((prev) =>
          prev.map((t) =>
            String(t.id) === String(activeThreadId) ? { ...t, unread: false, unreadCount: 0 } : t,
          ),
        )
        pollUnread()
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [activeThreadId])

  const mergePageIntoMessages = useCallback((list, meta) => {
    setMessages((prev) => {
      const incoming = new Map(list.map((m) => [m.id, m]))
      const prevIds = new Set(prev.map((m) => m.id))
      const updated = prev.map((m) => incoming.get(m.id) || m)
      const brandNew = list.filter((m) => !prevIds.has(m.id))
      return brandNew.length ? [...updated, ...brandNew] : updated
    })
    if (meta && typeof meta.hasNext === 'boolean' && olderPage === 1) {
      setHasOlder(Boolean(meta.hasNext))
    }
    prefetchChatMedia(list)
  }, [olderPage])

  const bumpThreadWithMessage = useCallback((conversationId, msg, { markRead = false } = {}) => {
    let found = false
    setThreads((prev) => {
      const idx = prev.findIndex((t) => String(t.id) === String(conversationId))
      if (idx < 0) return prev
      found = true
      const thread = prev[idx]
      const isActive = String(activeThreadId) === String(conversationId)
      const updated = {
        ...thread,
        lastMessage: msg,
        updatedAt: msg.date || new Date().toISOString(),
        unread: markRead || isActive ? false : true,
        unreadCount:
          markRead || isActive ? 0 : Math.max(0, Number(thread.unreadCount || 0) + 1),
      }
      const rest = prev.filter((_, i) => i !== idx)
      return [updated, ...rest]
    })
    return found
  }, [activeThreadId])

  useEffect(() => {
    return subscribeMessageRealtime((payload) => {
      if (payload.type === 'message.created') {
        if (typeof payload.unreadCount === 'number') publishUnread(payload.unreadCount)
        const conversationId = payload.conversationId
        const incoming = mapRealtimeCreatedMessage(payload, user?.id)
        const isActive =
          conversationId != null && String(conversationId) === String(activeThreadId)

        if (incoming && isActive) {
          setTypingUserId(null)
          setMessages((prev) =>
            prev.some((m) => String(m.id) === String(incoming.id)) ? prev : [...prev, incoming],
          )
          bumpThreadWithMessage(conversationId, incoming, { markRead: true })
          markThreadRead(activeThreadId).catch(() => {})

          // Médias absents du SSE : hydrater sans jeter l’historique déjà chargé.
          if (payload.hasMedia) {
            fetchMessages(activeThreadId, { page: 1, perPage: 30 })
              .then(({ messages: list, meta }) => mergePageIntoMessages(list, meta))
              .catch(() => {})
          }
          return
        }

        if (incoming && conversationId) {
          const found = bumpThreadWithMessage(conversationId, incoming)
          if (!found) silentReload()
          return
        }

        silentReload()
        return
      }
      if (payload.type === 'message.deleted') {
        const conversationId = payload.conversationId
        const messageId = payload.messageId
        if (messageId == null) return
        if (String(conversationId) === String(activeThreadId)) {
          setMessages((prev) =>
            prev.map((m) =>
              String(m.id) === String(messageId)
                ? { ...m, deleted: true, content: '', media: [], pending: false, failed: false }
                : m,
            ),
          )
        }
        setThreads((prev) =>
          prev.map((t) => {
            if (String(t.id) !== String(conversationId)) return t
            if (!t.lastMessage || String(t.lastMessage.id) !== String(messageId)) return t
            return {
              ...t,
              lastMessage: {
                ...t.lastMessage,
                deleted: true,
                content: '',
                media: [],
              },
            }
          }),
        )
        return
      }
      if (payload.type === 'message.read' && String(payload.conversationId) === String(activeThreadId)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.mine ? { ...m, seen: true, seenCount: Math.max(1, m.seenCount || 1) } : m,
          ),
        )
        return
      }
      if (payload.type === 'message.typing' && String(payload.conversationId) === String(activeThreadId)) {
        if (user && String(payload.userId) === String(user.id)) return
        setTypingUserId(payload.userId || '1')
      }
    })
  }, [
    activeThreadId,
    bumpThreadWithMessage,
    mergePageIntoMessages,
    silentReload,
    user,
  ])

  useEffect(() => {
    if (!typingUserId) return undefined
    const t = setTimeout(() => setTypingUserId(null), 3000)
    return () => clearTimeout(t)
  }, [typingUserId])

  const loadOlder = useCallback(async () => {
    if (!activeThreadId || !hasOlder) return
    const next = olderPage + 1
    const { messages: older, meta } = await fetchMessages(activeThreadId, { page: next, perPage: 30 })
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id))
      return [...older.filter((m) => !seen.has(m.id)), ...prev]
    })
    prefetchChatMedia(older)
    setHasOlder(Boolean(meta.hasNext))
    setOlderPage(next)
  }, [activeThreadId, hasOlder, olderPage])

  const sendMessage = useCallback(
    async (threadId, content, media = []) => {
      const files = Array.isArray(media) ? media.filter(Boolean) : []
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const optimisticMedia = files.map((file, i) => {
        const url = URL.createObjectURL(file)
        const type = file.type?.startsWith('audio/')
          ? 'audio'
          : file.type?.startsWith('image/')
            ? 'image'
            : 'file'
        return {
          id: `${tempId}-m${i}`,
          mediaType: type,
          url,
          local: true,
        }
      })
      const optimistic = {
        id: tempId,
        conversationId: String(threadId),
        senderId: user?.id != null ? String(user.id) : '',
        senderName: user?.displayName || '',
        senderAvatar: user?.avatarUrl || user?.avatar || null,
        content: content || '',
        media: optimisticMedia,
        date: new Date().toISOString(),
        mine: true,
        seen: false,
        seenCount: 0,
        deleted: false,
        pending: true,
        failed: false,
      }
      setMessages((prev) => [...prev, optimistic])
      bumpThreadWithMessage(threadId, optimistic, { markRead: true })

      try {
        const created = await apiSend(threadId, content, { media: files })
        optimisticMedia.forEach((m) => {
          try {
            URL.revokeObjectURL(m.url)
          } catch {
            /* ignore */
          }
        })
        if (created) {
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempId)
            if (withoutTemp.some((m) => String(m.id) === String(created.id))) return withoutTemp
            return [...withoutTemp, created]
          })
          bumpThreadWithMessage(threadId, created, { markRead: true })
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
        }
        invalidate(QueryKeys.messages, { reason: 'send', threadId })
        return created
      } catch (err) {
        optimisticMedia.forEach((m) => {
          try {
            URL.revokeObjectURL(m.url)
          } catch {
            /* ignore */
          }
        })
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
        )
        throw err
      }
    },
    [bumpThreadWithMessage, user],
  )

  const deleteMessage = useCallback(
    async (threadId, messageId) => {
      // Optimistic tombstone
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? { ...m, deleted: true, content: '', media: [], pending: false }
            : m,
        ),
      )
      try {
        await apiDeleteMessage(threadId, messageId)
        invalidate(QueryKeys.messages, { reason: 'deleteMessage', threadId, messageId })
      } catch (err) {
        // Recharger le fil pour annuler l’optimistic si l’API refuse
        const { messages: list } = await fetchMessages(threadId, { page: 1, perPage: 30 }).catch(
          () => ({ messages: null }),
        )
        if (list) setMessages(list)
        throw err
      }
    },
    [],
  )

  const createThread = useCallback(
    async ({ recipientId, firstMessage }) => {
      const created = await apiCreateThread({
        recipientId,
        content: firstMessage || undefined,
      })
      if (created) {
        setThreads((prev) => {
          const rest = prev.filter((t) => t.id !== created.id)
          return [created, ...rest]
        })
      }
      invalidate(QueryKeys.messages, { reason: 'createThread', threadId: created?.id })
      return created
    },
    [],
  )

  const deleteThread = useCallback(async (threadId) => {
    await apiDeleteConversation(threadId)
    setThreads((prev) => prev.filter((t) => String(t.id) !== String(threadId)))
    if (String(activeThreadId) === String(threadId)) {
      setMessages([])
      setHasOlder(false)
      setOlderPage(1)
    }
    invalidate(QueryKeys.messages, { reason: 'deleteThread', threadId })
  }, [activeThreadId])

  const lastTypingSentAt = useRef(0)
  const notifyTyping = useCallback((threadId) => {
    if (!threadId) return
    const now = Date.now()
    // Évite un POST à chaque frappe — confort réseau + UX côté destinataire.
    if (now - lastTypingSentAt.current < 2000) return
    lastTypingSentAt.current = now
    sendTyping(threadId).catch(() => {})
  }, [])

  const unreadCount = useMemo(
    () => threads.filter((t) => t.unread).length,
    [threads],
  )

  return {
    threads,
    activeThread,
    messages,
    loading,
    loadingMessages,
    error,
    sendMessage,
    deleteMessage,
    unreadCount,
    createThread,
    deleteThread,
    reload: () => load({ silent: false }),
    silentReload,
    loadOlder,
    hasOlder,
    typingUserId,
    notifyTyping,
  }
}
