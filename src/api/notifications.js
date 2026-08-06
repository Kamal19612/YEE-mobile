import { ENDPOINTS } from '../config/api'
import { appApiFetch } from './client'

const NOTIFICATION_TYPES = new Set([
  'new_follower',
  'group_invitation',
  'group_join_request',
  'group_request_approved',
  'group_request_rejected',
  'institution_affiliation_request',
  'institution_affiliation_approved',
  'institution_affiliation_rejected',
])

function normalizeMediaUrl(url) {
  if (!url) return null
  let u = String(url).replace(/#038;/g, '&').replace(/&amp;/g, '&')
  if (u.startsWith('//')) u = `https:${u}`
  return u
}

function mapActor(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.ID ?? raw.userId ?? raw.user_id
  if (id == null || id === '') return null
  return {
    id: String(id),
    displayName: raw.displayName || raw.display_name || raw.name || '',
    avatarUrl: normalizeMediaUrl(raw.avatarUrl || raw.avatar_url || raw.avatar),
    profession: raw.profession || '',
  }
}

function mapSubject(raw) {
  if (!raw || typeof raw !== 'object') return null
  const typeRaw = raw.type || raw.objectType || raw.object_type
  const type = typeRaw === 'institution' ? 'institution' : typeRaw === 'group' ? 'group' : null
  if (!type) return null
  const id = raw.id ?? raw.ID ?? raw.objectId ?? raw.object_id
  if (id == null || id === '') return null
  const rawName = raw.name ?? raw.title
  const name =
    rawName != null && String(rawName).trim() !== '' && String(rawName).toLowerCase() !== 'null'
      ? String(rawName)
      : null
  return { type, id: String(id), name }
}

/** Normalise une notification App API (tolérant snake_case / alias). */
export function mapNotification(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.ID ?? raw.notificationId ?? raw.notification_id
  if (id == null || id === '') return null

  const typeRaw = String(raw.type || raw.notificationType || raw.notification_type || '')
  const type = NOTIFICATION_TYPES.has(typeRaw) ? typeRaw : typeRaw || 'new_follower'

  let isRead = false
  if (typeof raw.isRead === 'boolean') {
    isRead = raw.isRead
  } else if (typeof raw.is_read === 'boolean') {
    isRead = raw.is_read
  } else if (typeof raw.unread === 'boolean') {
    isRead = !raw.unread
  } else if (raw.is_new === false || raw.is_new === 0) {
    isRead = true
  } else if (raw.is_new === true || raw.is_new === 1) {
    isRead = false
  }

  const actor =
    mapActor(raw.actor) ||
    mapActor(raw.user) ||
    (raw.actorId != null || raw.actor_id != null
      ? mapActor({
          id: raw.actorId ?? raw.actor_id,
          displayName: raw.actorName ?? raw.actor_name,
          avatarUrl: raw.actorAvatarUrl ?? raw.actor_avatar_url,
        })
      : null)

  return {
    id: String(id),
    type: NOTIFICATION_TYPES.has(type) ? type : 'new_follower',
    actor,
    subject: mapSubject(raw.subject || raw.object),
    isRead,
    unread: !isRead,
    createdAt:
      raw.createdAt ||
      raw.created_at ||
      raw.created ||
      raw.date ||
      raw.date_notified ||
      new Date().toISOString(),
  }
}

function extractNotificationList(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.notifications)) return data.notifications
  if (Array.isArray(data.results)) return data.results
  if (Array.isArray(data.data)) return data.data
  return []
}

/**
 * GET /notifications?unreadOnly=&page=&perPage=
 * `appApiFetch` ignore `meta` → pagination dérivée.
 */
export async function fetchNotifications({
  unreadOnly,
  page = 1,
  perPage = 20,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  })
  if (unreadOnly === true) params.set('unreadOnly', '1')
  if (unreadOnly === false) params.set('unreadOnly', '0')

  const data = await appApiFetch(`${ENDPOINTS.notifications.list}?${params.toString()}`, {
    auth: true,
  })
  const list = extractNotificationList(data)
  const notifications = list.map(mapNotification).filter(Boolean)
  const hasNext = notifications.length >= perPage

  return {
    notifications,
    meta: {
      page,
      perPage,
      hasNext,
      hasPrev: page > 1,
    },
  }
}

/** GET /notifications/unread-count → { count } */
export async function fetchUnreadCount() {
  const data = await appApiFetch(ENDPOINTS.notifications.unreadCount, { auth: true })
  if (typeof data === 'number') return data
  if (typeof data?.count === 'number') return data.count
  if (typeof data?.unreadCount === 'number') return data.unreadCount
  if (typeof data?.unread_count === 'number') return data.unread_count
  return Number(data?.count) || 0
}

/** POST /notifications/{id}/read */
export async function markNotificationRead(id) {
  return appApiFetch(ENDPOINTS.notifications.read(String(id)), {
    method: 'POST',
    auth: true,
  })
}

/** POST /notifications/read-all */
export async function markAllNotificationsRead() {
  return appApiFetch(ENDPOINTS.notifications.readAll, {
    method: 'POST',
    auth: true,
  })
}
