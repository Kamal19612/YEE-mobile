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

export async function fetchNotifications({ page = 1, perPage = 20, isNew, token } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (typeof isNew === 'boolean') params.set('is_new', isNew ? 'true' : 'false')
  const data = await apiFetch(`${BASE}?${params}`, { token })
  const list = Array.isArray(data) ? data : data?.notifications || []
  return list.map(mapNotification)
}

export async function markNotificationRead(id, { token } = {}) {
  return apiFetch(`${BASE}/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ is_new: false }),
  })
}

export async function markAllNotificationsRead({ token } = {}) {
  return apiFetch(BASE, {
    method: 'PUT',
    token,
    body: JSON.stringify({ is_new: false }),
  })
}
