import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import { demoNotifications } from '../data/notificationsData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export function useNotifications({ filter = 'all' } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const perPage = 5

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 250))
          if (alive) setItems(demoNotifications)
        } else {
          const list = await fetchNotifications()
          if (alive) setItems(list)
        }
      } catch {
        if (alive) setItems(demoNotifications)
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => n.unread)
    if (filter === 'read') return items.filter((n) => !n.unread)
    return items
  }, [items, filter])

  const visible = useMemo(() => filtered.slice(0, page * perPage), [filtered, page])
  const hasMore = visible.length < filtered.length
  const unreadCount = useMemo(() => items.filter((n) => n.unread).length, [items])

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    if (!USE_MOCK) {
      try {
        await markNotificationRead(id)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
    if (!USE_MOCK) {
      try {
        await markAllNotificationsRead()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return {
    notifications: visible,
    loading,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
    markRead,
    markAllRead,
    unreadCount,
    total: filtered.length,
  }
}
