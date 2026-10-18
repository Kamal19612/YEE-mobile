import { API_TIMEOUT_MS, ENDPOINTS } from '../config/api'
import { appApiFetch, getToken, refreshAccessToken } from './client'

/** Chemin renvoyé par l'API. Une URL http(s) publique de stockage n'est pas chargée. */
export function isChatMediaPath(url) {
  return typeof url === 'string' && /^\/(?:api\/)?conversations\/[^/]+\/media\/\d+$/.test(url)
}

function resolveChatMediaUrl(url) {
  if (typeof url !== 'string' || !url) return url
  if (url.startsWith('/api/') || url.startsWith('http')) return url
  if (/^\/conversations\/[^/]+\/media\/\d+$/.test(url)) return `/api${url}`
  return url
}

function mapParticipant(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id
  if (id == null || id === '') return null
  return {
    id: String(id),
    displayName: raw.displayName || raw.display_name || 'Member',
    avatar: raw.avatarUrl || raw.avatar || null,
  }
}

function mapMedia(raw) {
  if (!raw || typeof raw !== 'object') return null
  const type = raw.mediaType || raw.media_type || raw.type
  if (type !== 'image' && type !== 'audio') return null
  return {
    id: String(raw.id ?? ''),
    mediaType: type,
    url: isChatMediaPath(raw.url) ? resolveChatMediaUrl(raw.url) : '',
  }
}

/**
 * Télécharge une pièce jointe avec le jeton d'accès.
 * Une balise img ou audio ne peut pas envoyer Authorization.
 *
 * Cache session : évite de re-télécharger à chaque remount (refresh realtime du fil).
 * @returns {Promise<{ blob: Blob, filename: string, objectUrl: string }>}
 */
const chatMediaCache = new Map()
const chatMediaInflight = new Map()
const CHAT_MEDIA_CACHE_MAX = 48

export function peekChatMediaCache(path) {
  if (!path) return null
  return chatMediaCache.get(path) || null
}

export async function fetchChatMediaBlob(path) {
  const resolved = resolveChatMediaUrl(path)
  if (!isChatMediaPath(resolved) && !isChatMediaPath(path)) {
    throw new Error('Média introuvable')
  }
  const cached = chatMediaCache.get(resolved)
  if (cached?.objectUrl && cached?.blob) {
    return cached
  }
  const pending = chatMediaInflight.get(resolved)
  if (pending) return pending

  const job = fetchChatMediaBlobOnce(resolved, false)
    .then((result) => {
      rememberChatMedia(resolved, result)
      return chatMediaCache.get(resolved)
    })
    .finally(() => {
      chatMediaInflight.delete(resolved)
    })
  chatMediaInflight.set(resolved, job)
  return job
}

/** Précharge les médias d’une liste de messages (affichage plus rapide). */
export function prefetchChatMedia(messages) {
  const list = Array.isArray(messages) ? messages : []
  for (const msg of list) {
    for (const m of msg?.media || []) {
      if (m?.url && isChatMediaPath(m.url) && !chatMediaCache.has(m.url) && !chatMediaInflight.has(m.url)) {
        void fetchChatMediaBlob(m.url).catch(() => {})
      }
    }
  }
}

function rememberChatMedia(path, { blob, filename }) {
  if (chatMediaCache.size >= CHAT_MEDIA_CACHE_MAX) {
    const oldest = chatMediaCache.keys().next().value
    const entry = chatMediaCache.get(oldest)
    if (entry?.objectUrl) URL.revokeObjectURL(entry.objectUrl)
    chatMediaCache.delete(oldest)
  }
  const prev = chatMediaCache.get(path)
  if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl)
  chatMediaCache.set(path, {
    blob,
    filename,
    mime: blob?.type || '',
    objectUrl: URL.createObjectURL(blob),
  })
}

function parseContentDispositionFilename(header) {
  if (!header) return null
  const utf = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim().replace(/^"|"$/g, ''))
    } catch {
      /* ignore */
    }
  }
  const plain = /filename\s*=\s*("?)([^";]+)\1/i.exec(header)
  return plain?.[2]?.trim() || null
}

function fallbackFilename(path, mediaType, contentType) {
  const id = String(path || '').split('/').pop() || 'media'
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase()
  if (mime === 'image/png') return `${id}.png`
  if (mime === 'image/webp') return `${id}.webp`
  if (mime === 'image/jpeg' || mime === 'image/jpg') return `${id}.jpg`
  if (mime === 'audio/mpeg') return `${id}.mp3`
  if (mime === 'audio/mp4' || mime === 'audio/aac' || mime === 'audio/x-m4a') return `${id}.m4a`
  if (mime === 'audio/ogg') return `${id}.ogg`
  if (mime === 'audio/webm') return `${id}.webm`
  if (mime === 'audio/wav' || mime === 'audio/wave' || mime === 'audio/x-wav') return `${id}.wav`
  if (mediaType === 'audio') return `${id}.m4a`
  if (mediaType === 'image') return `${id}.jpg`
  return id
}

async function fetchChatMediaBlobOnce(path, retried) {
  const token = getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const res = await fetch(path, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
    if (res.status === 401 && !retried) {
      await refreshAccessToken()
      return fetchChatMediaBlobOnce(path, true)
    }
    if (!res.ok) {
      throw new Error('Média introuvable')
    }
    const blob = await res.blob()
    const filename =
      parseContentDispositionFilename(res.headers.get('Content-Disposition')) ||
      fallbackFilename(path, null, res.headers.get('Content-Type') || blob.type)
    return { blob, filename }
  } finally {
    clearTimeout(timer)
  }
}

export function mapMessage(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id
  if (id == null || id === '') return null
  const deleted = Boolean(raw.deleted)
  return {
    id: String(id),
    conversationId: raw.conversationId ? String(raw.conversationId) : null,
    senderId: raw.senderId != null ? String(raw.senderId) : '',
    senderName: raw.senderName || 'Member',
    senderAvatar: raw.senderAvatar || null,
    content: deleted ? '' : raw.content || '',
    media: deleted ? [] : Array.isArray(raw.media) ? raw.media.map(mapMedia).filter(Boolean) : [],
    date: raw.createdAt || raw.date || new Date().toISOString(),
    mine: Boolean(raw.mine),
    seen: Boolean(raw.seen),
    seenCount: Number(raw.seenCount || 0),
    deleted,
    pending: Boolean(raw.pending),
    failed: Boolean(raw.failed),
  }
}

/** Message provisoire depuis l’événement SSE `message.created` (sans re-fetch). */
export function mapRealtimeCreatedMessage(payload, currentUserId) {
  if (!payload || typeof payload !== 'object') return null
  const id = payload.messageId ?? payload.id
  if (id == null || id === '') return null
  const senderId = payload.senderId != null ? String(payload.senderId) : ''
  return {
    id: String(id),
    conversationId: payload.conversationId ? String(payload.conversationId) : null,
    senderId,
    senderName: payload.senderName || 'Member',
    senderAvatar: payload.senderAvatarUrl || payload.senderAvatar || null,
    content: payload.content || '',
    media: [],
    date: payload.createdAt || new Date().toISOString(),
    mine: Boolean(currentUserId && senderId && String(currentUserId) === senderId),
    seen: false,
    seenCount: 0,
    pendingMedia: Boolean(payload.hasMedia),
  }
}

export function mapThread(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id
  if (id == null || id === '') return null
  const participants = Array.isArray(raw.participants)
    ? raw.participants.map(mapParticipant).filter(Boolean)
    : []
  const messages = Array.isArray(raw.messages) ? raw.messages.map(mapMessage).filter(Boolean) : []
  return {
    id: String(id),
    type: raw.type || 'dm',
    subject: raw.subject || '',
    groupId: raw.groupId ? String(raw.groupId) : null,
    groupName: raw.groupName || null,
    isGroup: Boolean(raw.isGroup || raw.type === 'group'),
    participants,
    lastMessage: raw.lastMessage ? mapMessage(raw.lastMessage) : messages[messages.length - 1] || null,
    unread: Boolean(raw.unread),
    unreadCount: Number(raw.unreadCount || 0),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    messages,
  }
}

export async function fetchThreads({ page = 1, perPage = 30 } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  const result = await appApiFetch(`${ENDPOINTS.conversations.list}?${params}`, {
    auth: true,
    raw: true,
  })
  const list = Array.isArray(result?.data) ? result.data : []
  return {
    threads: list.map(mapThread).filter(Boolean),
    meta: result?.meta || {},
  }
}

export async function fetchThread(id) {
  const data = await appApiFetch(ENDPOINTS.conversations.detail(id), { auth: true })
  return mapThread(data)
}

export async function fetchMessages(id, { page = 1, perPage = 30 } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  const result = await appApiFetch(`${ENDPOINTS.conversations.messages(id)}?${params}`, {
    auth: true,
    raw: true,
  })
  const list = Array.isArray(result?.data) ? result.data : []
  return {
    messages: list.map(mapMessage).filter(Boolean),
    meta: result?.meta || {},
  }
}

export async function fetchUnreadCount() {
  const data = await appApiFetch(ENDPOINTS.conversations.unreadCount, { auth: true })
  return Number(data?.count ?? 0)
}

export async function sendMessage(threadId, content, { media = [] } = {}) {
  const files = Array.isArray(media) ? media.filter(Boolean) : []
  if (files.length > 0) {
    const formData = new FormData()
    formData.append('content', content || '')
    files.forEach((file) => {
      if (file.type && file.type.startsWith('audio/')) formData.append('audio', file)
      else formData.append('media', file)
    })
    const data = await appApiFetch(ENDPOINTS.conversations.messages(threadId), {
      method: 'POST',
      auth: true,
      body: formData,
    })
    return mapMessage(data)
  }
  const data = await appApiFetch(ENDPOINTS.conversations.messages(threadId), {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ content }),
  })
  return mapMessage(data)
}

export async function createThread({ recipientId, content } = {}) {
  const data = await appApiFetch(ENDPOINTS.conversations.list, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      recipientId,
      content: content || undefined,
    }),
  })
  return mapThread(data)
}

export async function markThreadRead(threadId) {
  return appApiFetch(ENDPOINTS.conversations.read(threadId), {
    method: 'POST',
    auth: true,
  })
}

export async function sendTyping(threadId) {
  return appApiFetch(ENDPOINTS.conversations.typing(threadId), {
    method: 'POST',
    auth: true,
  })
}

/** Soft-delete d’un message (auteur) — tombstone pour tous. */
export async function deleteMessage(threadId, messageId) {
  return appApiFetch(ENDPOINTS.conversations.message(threadId, messageId), {
    method: 'DELETE',
    auth: true,
  })
}

/** Supprimer pour moi — masque la conversation côté serveur. */
export async function deleteConversation(threadId) {
  return appApiFetch(ENDPOINTS.conversations.delete(threadId), {
    method: 'DELETE',
    auth: true,
  })
}

export async function openGroupConversation(groupId) {
  const data = await appApiFetch(ENDPOINTS.conversations.group(groupId), { auth: true })
  return mapThread(data)
}

export async function searchConversations(q, { page = 1, perPage = 20 } = {}) {
  const params = new URLSearchParams({ q, page: String(page), perPage: String(perPage) })
  const data = await appApiFetch(`${ENDPOINTS.conversations.search}?${params}`, { auth: true })
  return {
    conversations: Array.isArray(data?.conversations)
      ? data.conversations.map(mapThread).filter(Boolean)
      : [],
    messages: Array.isArray(data?.messages)
      ? data.messages.map((hit) => ({
          conversationId: String(hit.conversationId),
          conversationSubject: hit.conversationSubject || '',
          isGroup: Boolean(hit.isGroup),
          message: mapMessage(hit.message),
        }))
      : [],
  }
}

export async function fetchAdminUserConversations(userId, { page = 1, perPage = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  const result = await appApiFetch(`${ENDPOINTS.admin.accountConversations(userId)}?${params}`, {
    auth: true,
    raw: true,
  })
  return {
    threads: Array.isArray(result?.data) ? result.data.map(mapThread).filter(Boolean) : [],
    meta: result?.meta || {},
  }
}

export async function deleteAdminConversation(conversationId) {
  return appApiFetch(ENDPOINTS.admin.deleteConversation(conversationId), {
    method: 'DELETE',
    auth: true,
  })
}
