import { ENABLE_BUDDYPRESS } from '../config/api'
import { apiFetch } from './client'

const BASE = '/buddypress/v1/notifications'

export function mapNotification(item) {
  return {
    id: item.id,
    text: item.description?.rendered || item.content || item.action || 'Notification',
    time: item.date || item.date_notified || new Date().toISOString(),
    unread: Boolean(item.is_new ?? item.unread),
    component: item.component || 'activity',
    href: item.link || '/',
  }
}

/** BuddyPress désactivé — pas d’appel réseau. */
export async function fetchNotifications() {
  if (!ENABLE_BUDDYPRESS) return []
  const params = new URLSearchParams({ page: '1', per_page: '20' })
  try {
    const data = await apiFetch(`${BASE}?${params}`, {
      auth: true,
      suppressUnauthorized: true,
    })
    const list = Array.isArray(data) ? data : data?.notifications || []
    return list.map(mapNotification)
  } catch (err) {
    if (err.status === 401 || err.status === 403 || err.status === 400) return []
    throw err
  }
}

export async function markNotificationRead(id, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ is_new: false }),
  })
}

export async function markAllNotificationsRead({ token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(BASE, {
    method: 'PUT',
    token,
    body: JSON.stringify({ is_new: false }),
  })
}
