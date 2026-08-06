import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkRead,
} from '../api/notifications'
import { useAuth } from './useAuth'

const POLL_MS = 30_000
const DEFAULT_PER_PAGE = 20

/** Compteur non-lu partagé (un seul poll pour toute l’app). */
const unreadListeners = new Set()
const listReloadListeners = new Set()
let sharedUnread = 0
let pollTimer = null
let pollAlive = false

function publishUnread(count) {
  const next = Math.max(0, Number(count) || 0)
  const prev = sharedUnread
  sharedUnread = next
  unreadListeners.forEach((fn) => {
    try {
      fn(sharedUnread)
    } catch {
      /* ignore */
    }
  })
  // Nouveau badge → recharger les listes montées (sinon dropdown figé au montage).
  if (next > prev) {
    listReloadListeners.forEach((fn) => {
      try {
        fn()
      } catch {
        /* ignore */
      }
    })
  }
}

function adjustSharedUnread(delta) {
  publishUnread(sharedUnread + delta)
}

export function requestNotificationsReload() {
  listReloadListeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* ignore */
    }
  })
}

async function pollTick() {
  if (!pollAlive) return
  try {
    const n = await fetchUnreadCount()
    if (pollAlive) publishUnread(n)
  } catch {
    /* conserver le dernier compteur */
  }
}

function ensurePolling(intervalMs = POLL_MS) {
  if (pollTimer) return
  pollAlive = true
  pollTick()
  pollTimer = setInterval(pollTick, intervalMs)
}

function stopPolling() {
  pollAlive = false
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  publishUnread(0)
}

/**
 * Badge non-lu — poll ~30s unique tant qu’au moins un hook est monté + user connecté.
 */
export function useUnreadCount({ intervalMs = POLL_MS } = {}) {
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
      stopPolling()
      return undefined
    }
    ensurePolling(intervalMs)
    return () => {
      if (unreadListeners.size === 0) stopPolling()
    }
  }, [isAuthenticated, isBootstrapping, intervalMs])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      publishUnread(0)
      return 0
    }
    const n = await fetchUnreadCount()
    publishUnread(n)
    return n
  }, [isAuthenticated])

  return { count, unreadCount: count, refresh }
}

/**
 * Liste paginée + markRead / markAllRead optimistes avec rollback.
 */
export function useNotificationsList({
  unreadOnly,
  page = 1,
  perPage = DEFAULT_PER_PAGE,
  enabled = true,
} = {}) {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ page: 1, perPage, hasNext: false, hasPrev: false })
  const [loading, setLoading] = useState(Boolean(enabled && isAuthenticated))
  const [error, setError] = useState(null)
  const reloadRef = useRef(null)

  const load = useCallback(async () => {
    if (isBootstrapping) return
    if (!enabled || !isAuthenticated) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await fetchNotifications({ unreadOnly, page, perPage })
      setItems(result.notifications)
      setMeta(result.meta)
    } catch (err) {
      setItems([])
      setError(err.message || 'Impossible de charger les notifications')
    } finally {
      setLoading(false)
    }
  }, [enabled, isAuthenticated, isBootstrapping, unreadOnly, page, perPage])

  reloadRef.current = load

  useEffect(() => {
    load()
  }, [load])

  // Rechargement quand le badge change (poll) ou sur demande (ouverture dropdown).
  useEffect(() => {
    const onReload = () => {
      reloadRef.current?.()
    }
    listReloadListeners.add(onReload)
    return () => listReloadListeners.delete(onReload)
  }, [])

  // Rechargement au retour sur l’onglet.
  useEffect(() => {
    const onFocus = () => {
      if (isAuthenticated && !isBootstrapping) reloadRef.current?.()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [isAuthenticated, isBootstrapping])

  const markRead = useCallback(async (id) => {
    let wasUnread = false
    setItems((prev) => {
      const target = prev.find((n) => String(n.id) === String(id))
      wasUnread = Boolean(target && (target.unread || !target.isRead))
      if (!wasUnread) return prev
      return prev.map((n) =>
        String(n.id) === String(id) ? { ...n, isRead: true, unread: false } : n,
      )
    })
    if (wasUnread) adjustSharedUnread(-1)

    try {
      await apiMarkRead(id)
    } catch (err) {
      if (wasUnread) {
        setItems((prev) =>
          prev.map((n) =>
            String(n.id) === String(id) ? { ...n, isRead: false, unread: true } : n,
          ),
        )
        adjustSharedUnread(1)
      }
      throw err
    }
  }, [])

  const markAllRead = useCallback(async () => {
    const snapshot = items
    const unreadBefore = sharedUnread
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true, unread: false })))
    publishUnread(0)

    try {
      await apiMarkAllRead()
    } catch (err) {
      setItems(snapshot)
      publishUnread(unreadBefore)
      throw err
    }
  }, [items])

  return {
    notifications: items,
    meta,
    loading: loading || isBootstrapping,
    error,
    hasNext: meta.hasNext,
    hasPrev: meta.hasPrev,
    reload: load,
    markRead,
    markAllRead,
  }
}

/**
 * Compat UI (page, dropdown, profil).
 * `filter`: 'all' | 'unread' | 'read'
 */
export function useNotifications({ filter = 'all', perPage = 20 } = {}) {
  const { unreadCount, refresh } = useUnreadCount()
  const [page, setPage] = useState(1)
  const unreadOnly = filter === 'unread' ? true : undefined

  const list = useNotificationsList({
    unreadOnly: filter === 'read' ? false : unreadOnly,
    page: 1,
    perPage: page * perPage,
  })

  const notifications =
    filter === 'read'
      ? list.notifications.filter((n) => n.isRead)
      : filter === 'unread'
        ? list.notifications.filter((n) => !n.isRead)
        : list.notifications

  const reload = useCallback(async () => {
    await refresh().catch(() => {})
    await list.reload()
  }, [refresh, list.reload])

  return {
    notifications,
    loading: list.loading,
    error: list.error,
    hasMore: list.hasNext,
    loadMore: () => setPage((p) => p + 1),
    markRead: list.markRead,
    markAllRead: list.markAllRead,
    unreadCount,
    total: notifications.length,
    reload,
  }
}
