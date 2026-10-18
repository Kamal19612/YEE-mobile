import { ENDPOINTS } from '../config/api'
import { getCachedBlob } from '../utils/pdfFileCache'
import { API_BASE, appApiFetch, getToken, refreshAccessToken } from './client'

function resolveApiPath(path) {
  if (!path) return API_BASE || '/api'
  if (path.startsWith('http')) return path
  const base = API_BASE || '/api'
  if (path === base || path.startsWith(`${base}/`)) return path
  if (base === '/api' && (path === '/api' || path.startsWith('/api/'))) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function authOpts() {
  const token = getToken()
  return token ? { auth: true } : { skipAuth: true }
}

export function mapEventCategory(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: String(raw.id ?? ''),
    slug: raw.slug || '',
    name: raw.name || '',
    sortOrder: Number(raw.sortOrder) || 0,
    eventCount: Number(raw.eventCount) || 0,
  }
}

export function mapEventReport(raw, eventId) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  return {
    id,
    title: raw.title || '',
    originalFilename: raw.originalFilename || raw.original_filename || '',
    mimeType: raw.mimeType || raw.mime_type || 'application/pdf',
    byteSize: Number(raw.byteSize ?? raw.byte_size) || 0,
    fileUrl: raw.fileUrl || raw.file_url || (eventId ? `/api/events/${eventId}/report` : ''),
  }
}

export function mapEventVisual(raw, eventId) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  return {
    id,
    originalFilename: raw.originalFilename || raw.original_filename || '',
    mimeType: raw.mimeType || raw.mime_type || '',
    byteSize: Number(raw.byteSize ?? raw.byte_size) || 0,
    sortOrder: Number(raw.sortOrder ?? raw.sort_order) || 0,
    url: raw.url || (eventId && id ? `/api/events/${eventId}/visuals/${id}` : ''),
  }
}

export function mapEvent(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  const report = mapEventReport(raw.report, id)
  const visualsRaw = Array.isArray(raw.visuals) ? raw.visuals : []
  return {
    id,
    title: raw.title || '',
    slug: raw.slug || '',
    categoryId: String(raw.categoryId ?? raw.category_id ?? ''),
    categorySlug: raw.categorySlug || raw.category_slug || '',
    categoryName: raw.categoryName || raw.category_name || '',
    description: typeof raw.description === 'string' ? raw.description : '',
    startsAt: raw.startsAt || raw.starts_at || '',
    endsAt: raw.endsAt || raw.ends_at || '',
    temporalStatus: raw.temporalStatus || raw.temporal_status || 'past',
    locationType: raw.locationType || raw.location_type || 'online',
    joinUrl: raw.joinUrl || raw.join_url || '',
    venueAddress: raw.venueAddress || raw.venue_address || '',
    coverType: raw.coverType || raw.cover_type || '',
    coverUrl:
      raw.coverUrl ||
      raw.cover_url ||
      (raw.coverType === 'photo' || raw.cover_type === 'photo' ? `/api/events/${id}/cover` : ''),
    videoUrl: raw.videoUrl || raw.video_url || '',
    videoProvider: raw.videoProvider || raw.video_provider || '',
    videoExternalId: raw.videoExternalId || raw.video_external_id || '',
    videoEmbedUrl: raw.videoEmbedUrl || raw.video_embed_url || '',
    report,
    visuals: visualsRaw.map((v) => mapEventVisual(v, id)).filter(Boolean),
    status: raw.status || 'published',
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
    createdByName: raw.createdByName || raw.created_by_name || '',
  }
}

/** GET /events/categories */
export async function fetchEventCategories() {
  const data = await appApiFetch(ENDPOINTS.events.categories, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapEventCategory).filter(Boolean)
}

/** POST /events/categories */
export async function createEventCategory({ name }) {
  const data = await appApiFetch(ENDPOINTS.events.categories, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ name }),
  })
  return mapEventCategory(data)
}

/** PATCH /events/categories/{id} */
export async function updateEventCategory(id, patch) {
  const data = await appApiFetch(ENDPOINTS.events.category(String(id)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(patch),
  })
  return mapEventCategory(data)
}

/** DELETE /events/categories/{id} */
export async function deleteEventCategory(id) {
  return appApiFetch(ENDPOINTS.events.category(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/** GET /events?category=&status=&search= */
export async function fetchEvents({ category = '', status = '', search = '' } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', String(category))
  if (status) params.set('status', String(status))
  if (search) params.set('search', String(search))
  const qs = params.toString()
  const path = qs ? `${ENDPOINTS.events.list}?${qs}` : ENDPOINTS.events.list
  const data = await appApiFetch(path, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapEvent).filter(Boolean)
}

/** GET /events/{id} */
export async function fetchEvent(id) {
  const data = await appApiFetch(ENDPOINTS.events.detail(String(id)), authOpts())
  return mapEvent(data)
}

/**
 * POST /events — multipart (photo) ou JSON (vidéo / sans couverture).
 */
export async function createEvent(payload) {
  const {
    title,
    categoryId,
    description,
    locationType,
    joinUrl,
    venueAddress,
    startsAt,
    endsAt,
    coverType,
    videoUrl,
    coverPhoto,
  } = payload || {}

  if (coverType === 'photo' && coverPhoto) {
    const formData = new FormData()
    formData.append('title', title || '')
    formData.append('categoryId', categoryId || '')
    formData.append('description', description || '')
    formData.append('locationType', locationType || 'online')
    if (joinUrl) formData.append('joinUrl', joinUrl)
    if (venueAddress) formData.append('venueAddress', venueAddress)
    formData.append('startsAt', startsAt || '')
    formData.append('endsAt', endsAt || '')
    formData.append('coverType', 'photo')
    formData.append('coverPhoto', coverPhoto)
    const data = await appApiFetch(ENDPOINTS.events.list, {
      method: 'POST',
      auth: true,
      body: formData,
      timeoutMs: 120_000,
    })
    return mapEvent(data)
  }

  const data = await appApiFetch(ENDPOINTS.events.list, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      title,
      categoryId,
      description,
      locationType,
      joinUrl: joinUrl || null,
      venueAddress: venueAddress || null,
      startsAt,
      endsAt,
      coverType: coverType || null,
      videoUrl: videoUrl || null,
    }),
  })
  return mapEvent(data)
}

/** PATCH /events/{id} */
export async function updateEvent(id, patch) {
  const data = await appApiFetch(ENDPOINTS.events.detail(String(id)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(patch),
  })
  return mapEvent(data)
}

/** DELETE /events/{id} */
export async function deleteEvent(id) {
  return appApiFetch(ENDPOINTS.events.detail(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/** POST /events/{id}/report — PDF unique */
export async function uploadEventReport(id, { title, file }) {
  const formData = new FormData()
  if (title) formData.append('title', title)
  formData.append('file', file)
  const data = await appApiFetch(ENDPOINTS.events.report(String(id)), {
    method: 'POST',
    auth: true,
    body: formData,
    timeoutMs: 120_000,
  })
  return mapEvent(data)
}

/** DELETE /events/{id}/report */
export async function deleteEventReport(id) {
  const data = await appApiFetch(ENDPOINTS.events.report(String(id)), {
    method: 'DELETE',
    auth: true,
  })
  return mapEvent(data)
}

/** POST /events/{id}/visuals — galerie */
export async function uploadEventVisuals(id, files) {
  const formData = new FormData()
  const list = Array.isArray(files) ? files : [files]
  for (const file of list) {
    if (file) formData.append('files', file)
  }
  const data = await appApiFetch(ENDPOINTS.events.visuals(String(id)), {
    method: 'POST',
    auth: true,
    body: formData,
    timeoutMs: 120_000,
  })
  return mapEvent(data)
}

/** DELETE /events/{id}/visuals/{visualId} */
export async function deleteEventVisual(eventId, visualId) {
  const data = await appApiFetch(ENDPOINTS.events.visual(String(eventId), String(visualId)), {
    method: 'DELETE',
    auth: true,
  })
  return mapEvent(data)
}

async function fetchAuthBlobOnce(path, retried) {
  const token = getToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(resolveApiPath(path), {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
    if (res.status === 401 && !retried) {
      await refreshAccessToken()
      return fetchAuthBlobOnce(path, true)
    }
    if (!res.ok) throw new Error('file_unavailable')
    const blob = await res.blob()
    const type = String(blob.type || '').toLowerCase()
    // SPA fallback (index.html) si le chemin rate le proxy /api
    if (type.includes('text/html')) throw new Error('file_unavailable')
    return blob
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchEventCoverBlob(id) {
  return getCachedBlob(`event-cover:${id}`, () =>
    fetchAuthBlobOnce(ENDPOINTS.events.cover(String(id)), false),
  )
}

export async function fetchEventReportBlob(id) {
  return fetchAuthBlobOnce(ENDPOINTS.events.report(String(id)), false)
}

export async function fetchEventVisualBlob(eventId, visualId) {
  return getCachedBlob(`event-visual:${eventId}:${visualId}`, () =>
    fetchAuthBlobOnce(ENDPOINTS.events.visual(String(eventId), String(visualId)), false),
  )
}
