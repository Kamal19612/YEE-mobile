import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkRead,
  openNotificationStream,
} from '../api/notifications'
import { applyMessageUnread } from './useMessages'
import { publishMessageRealtime } from '../lib/messageRealtime'
import { invalidate, QueryKeys, subscribe } from '../lib/queryEvents'
import { presentMessageToast, presentNotificationToast, ensureNotificationPermission } from '../lib/presentLiveToast'
import { platformAllowsPush } from '../lib/pwaInstall'
import { enableWebPush, wasPushEnabledLocally } from '../lib/webPush'
import { useAuth } from './useAuth'

/** Poll de secours (SSE prioritaire). Court pour rester « quasi instantané » si le flux coupe. */
const POLL_MS = 4_000
const DEFAULT_PER_PAGE = 20

/** Compteur non-lu partagé (un seul poll + un flux SSE pour toute l’app). */
const unreadListeners = new Set()
const listReloadListeners = new Set()
let sharedUnread = 0
let pollTimer = null
let pollAlive = false
let streamAbort = null
let streamLoop = 0
let unreadHookMounts = 0
let visibilityBound = false

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
  if (typeof document !== 'undefined' && !visibilityBound) {
    visibilityBound = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && pollAlive) pollTick()
    })
  }
}

function stopPolling() {
  pollAlive = false
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function stopStream() {
  if (streamAbort) {
    streamAbort.abort()
    streamAbort = null
  }
  streamLoop += 1
}

function ensureStream() {
  if (streamAbort) return
  const ac = new AbortController()
  streamAbort = ac
  const generation = streamLoop

  const run = async () => {
    let delay = 1000
    while (streamAbort === ac && !ac.signal.aborted && generation === streamLoop) {
      try {
        await openNotificationStream({
          signal: ac.signal,
          onEvent: (payload) => {
            if (!payload || typeof payload !== 'object') return
            if (payload.type === 'sync' && payload.area) {
              if (payload.area === 'feed') invalidate(QueryKeys.feed, { reason: 'sync' })
              if (payload.area === 'groups') {
                invalidate(QueryKeys.groups, { reason: 'sync' })
                invalidate(QueryKeys.groupMembers, { reason: 'sync' })
              }
              if (payload.area === 'members') invalidate(QueryKeys.members, { reason: 'sync' })
              if (payload.area === 'institutions') {
                invalidate(QueryKeys.institutions, { reason: 'sync' })
                invalidate(QueryKeys.institutionMembers, { reason: 'sync' })
              }
              if (payload.area === 'resources') invalidate(QueryKeys.resources, { reason: 'sync' })
              if (payload.area === 'events') invalidate(QueryKeys.events, { reason: 'sync' })
              return
            }
            if (payload.type === 'feed.post_deleted' && payload.postId) {
              const detail = {
                reason: 'deletePost',
                postId: payload.postId,
                groupId: payload.groupId,
                authorId: payload.authorId,
              }
              invalidate(QueryKeys.feed, detail)
              invalidate(QueryKeys.members, detail)
              return
            }
            if (payload.type === 'feed.account_deleted' && payload.authorId) {
              const detail = {
                reason: 'deleteAccount',
                authorId: payload.authorId,
              }
              invalidate(QueryKeys.feed, detail)
              invalidate(QueryKeys.members, detail)
              return
            }
            if (payload.type === 'groups.deleted' && payload.groupId) {
              const detail = {
                reason: 'deleteGroup',
                groupId: payload.groupId,
              }
              invalidate(QueryKeys.groups, detail)
              invalidate(QueryKeys.groupMembers, detail)
              invalidate(QueryKeys.feed, detail)
              return
            }
            if (payload.type === 'institutions.deleted' && payload.institutionId) {
              const detail = {
                reason: 'deleteInstitution',
                institutionId: payload.institutionId,
              }
              invalidate(QueryKeys.institutions, detail)
              invalidate(QueryKeys.institutionMembers, detail)
              invalidate(QueryKeys.members, detail)
              return
            }
            if (
              payload.type === 'message.created' ||
              payload.type === 'message.read' ||
              payload.type === 'message.typing' ||
              payload.type === 'message.deleted'
            ) {
              publishMessageRealtime(payload)
              if (payload.type === 'message.created') {
                if (typeof payload.unreadCount === 'number') applyMessageUnread(payload.unreadCount)
                invalidate(QueryKeys.messages, { reason: 'message.created', conversationId: payload.conversationId })
                presentMessageToast(payload)
              }
              return
            }
            if (payload.type === 'notification.created' && typeof payload.unreadCount === 'number') {
              publishUnread(payload.unreadCount)
              requestNotificationsReload()
              presentNotificationToast(payload)
              return
            }
            if (payload.type === 'notification.created') {
              pollTick()
              requestNotificationsReload()
              presentNotificationToast(payload)
            }
          },
        })
        // Stream fermé proprement → reconnect rapide
        delay = 1000
      } catch (err) {
        if (ac.signal.aborted || generation !== streamLoop) return
        await new Promise((r) => setTimeout(r, delay))
        delay = Math.min(15_000, delay * 2)
      }
    }
  }

  run()
}

function stopRealtime({ clearBadge = false } = {}) {
  stopStream()
  stopPolling()
  if (clearBadge) publishUnread(0)
}

/**
 * Badge non-lu — SSE temps réel + poll de secours tant qu’un hook est monté.
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
      stopRealtime({ clearBadge: true })
      return undefined
    }
    unreadHookMounts += 1
    ensurePolling(intervalMs)
    ensureStream()
    // Soft ask — les navigateurs peuvent ignorer hors geste utilisateur.
    ensureNotificationPermission().catch(() => {})
    // Renouveler l’abonnement push si déjà activé (geste préalable).
    if (wasPushEnabledLocally() && platformAllowsPush()) {
      enableWebPush().catch(() => {})
    }
    return () => {
      unreadHookMounts = Math.max(0, unreadHookMounts - 1)
      if (unreadHookMounts === 0) stopRealtime({ clearBadge: false })
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

  // Mutations sociales (like, comment, follow…) → rafraîchir le badge en silence
  useEffect(() => {
    if (!isAuthenticated || isBootstrapping) return undefined
    return subscribe(QueryKeys.notifications, () => {
      refresh().catch(() => {})
    })
  }, [isAuthenticated, isBootstrapping, refresh])

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

  const load = useCallback(async ({ silent = false } = {}) => {
    if (isBootstrapping) return
    if (!enabled || !isAuthenticated) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      const result = await fetchNotifications({ unreadOnly, page, perPage })
      setItems(result.notifications)
      setMeta(result.meta)
      if (silent) setError(null)
    } catch (err) {
      if (silent) return
      setItems([])
      setError(err.message || 'Impossible de charger les notifications')
    } finally {
      if (!silent) setLoading(false)
      else setLoading(false)
    }
  }, [enabled, isAuthenticated, isBootstrapping, unreadOnly, page, perPage])

  reloadRef.current = load

  useEffect(() => {
    load()
  }, [load])

  // Rechargement quand le badge change (poll) ou sur demande (ouverture dropdown).
  useEffect(() => {
    const onReload = () => {
      reloadRef.current?.({ silent: true })
    }
    listReloadListeners.add(onReload)
    return () => listReloadListeners.delete(onReload)
  }, [])

  // Invalidations croisées (queryEvents) → liste sans spinner
  useEffect(() => {
    return subscribe(QueryKeys.notifications, () => {
      reloadRef.current?.({ silent: true })
    })
  }, [])

  // Rechargement au retour sur l’onglet.
  useEffect(() => {
    const onFocus = () => {
      if (isAuthenticated && !isBootstrapping) reloadRef.current?.({ silent: true })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && !isBootstrapping) {
        reloadRef.current?.({ silent: true })
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
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
