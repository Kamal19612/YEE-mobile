import { ENABLE_BUDDYPRESS } from '../config/api'
import { apiFetch } from './client'

const BASE = '/buddypress/v1/messages'

export function mapThread(item) {
  const messages = (item.messages || []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    senderName: m.sender_name || m.sender_data?.name || 'Member',
    content: m.message?.raw || m.message?.rendered || m.content || '',
    date: m.date_sent || m.date || new Date().toISOString(),
  }))
  return {
    id: item.id,
    subject: item.subject?.raw || item.subject || '',
    participants: (item.recipients || item.participants || []).map((p) => ({
      id: p.user_id || p.id,
      displayName: p.name || p.display_name || 'Member',
      avatar: p.user_avatars?.thumb || p.avatar || null,
    })),
    unread: Boolean(item.unread_count > 0 || item.unread),
    updatedAt: item.date || item.last_message_date || new Date().toISOString(),
    isGroup: Boolean(item.is_group || item.group_id),
    messages,
  }
}

/** BuddyPress désactivé — pas d’appel réseau. */
export async function fetchThreads() {
  if (!ENABLE_BUDDYPRESS) return []
  const params = new URLSearchParams({ page: '1', per_page: '20', box: 'inbox' })
  try {
    const data = await apiFetch(`${BASE}?${params}`, {
      auth: true,
      suppressUnauthorized: true,
    })
    const list = Array.isArray(data) ? data : data?.threads || []
    return list.map(mapThread)
  } catch (err) {
    if (err.status === 401 || err.status === 403 || err.status === 400) return []
    throw err
  }
}

export async function fetchThread(id, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  const data = await apiFetch(`${BASE}/${id}`, { token })
  return mapThread(data)
}

export async function sendMessage(threadId, content, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${threadId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ message: content, id: threadId }),
  })
}

export async function createThread({ recipients, subject, content, token } = {}) {
  if (!ENABLE_BUDDYPRESS) {
    return {
      id: Date.now(),
      subject: subject || '',
      participants: [],
      unread: false,
      updatedAt: new Date().toISOString(),
      messages: [],
    }
  }
  return apiFetch(BASE, {
    method: 'POST',
    token,
    body: JSON.stringify({ recipients, subject, message: content }),
  })
}
