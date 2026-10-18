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

export function mapCategory(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: String(raw.id ?? ''),
    slug: raw.slug || '',
    name: raw.name || '',
    sortOrder: Number(raw.sortOrder) || 0,
    resourceCount: Number(raw.resourceCount) || 0,
  }
}

/** Normalise une ressource App API. */
export function mapResource(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id ?? '')
  const coverUrl = raw.coverUrl || raw.cover_url || null
  const byteSizeRaw = raw.byteSize ?? raw.byte_size
  return {
    id,
    title: raw.title || '',
    slug: raw.slug || '',
    categoryId: String(raw.categoryId ?? raw.category_id ?? ''),
    categorySlug: raw.categorySlug || raw.category_slug || raw.category || '',
    categoryName: raw.categoryName || raw.category_name || '',
    language: raw.language || '',
    description: typeof raw.description === 'string' ? raw.description : '',
    originalFilename: raw.originalFilename || raw.original_filename || '',
    mimeType: raw.mimeType || raw.mime_type || 'application/pdf',
    fileUrl: raw.fileUrl || raw.file_url || (id ? `/api/resources/${id}/file` : ''),
    coverUrl: coverUrl ? String(coverUrl) : null,
    byteSize: byteSizeRaw != null && byteSizeRaw !== '' ? Number(byteSizeRaw) : null,
    status: raw.status || 'published',
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
    createdByName: raw.createdByName || raw.created_by_name || '',
  }
}

/** En-têtes auth pour pdf.js (Range / streaming). */
export function resourceFileAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** GET /resources/categories */
export async function fetchCategories() {
  const data = await appApiFetch(ENDPOINTS.resources.categories, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapCategory).filter(Boolean)
}

/** POST /resources/categories */
export async function createCategory({ name }) {
  const data = await appApiFetch(ENDPOINTS.resources.categories, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ name }),
  })
  return mapCategory(data)
}

/** PATCH /resources/categories/{id} */
export async function updateCategory(id, patch) {
  const data = await appApiFetch(ENDPOINTS.resources.category(String(id)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(patch),
  })
  return mapCategory(data)
}

/** DELETE /resources/categories/{id} */
export async function deleteCategory(id) {
  return appApiFetch(ENDPOINTS.resources.category(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/** GET /resources?category=&language=&search= */
export async function fetchResources({ category = '', language = '', search = '' } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', String(category))
  if (language) params.set('language', String(language))
  if (search) params.set('search', String(search))
  const qs = params.toString()
  const path = qs ? `${ENDPOINTS.resources.list}?${qs}` : ENDPOINTS.resources.list
  const data = await appApiFetch(path, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapResource).filter(Boolean)
}

/** GET /resources/{id} */
export async function fetchResource(id) {
  const data = await appApiFetch(ENDPOINTS.resources.detail(String(id)), authOpts())
  return mapResource(data)
}

/**
 * Télécharge le PDF authentifié en blob (évite le HTML SPA dans un iframe).
 */
export async function fetchResourceFileBlob(id) {
  return fetchResourceFileBlobOnce(ENDPOINTS.resources.file(String(id)), false)
}

/**
 * Miniature JPEG page 1 (si générée à l’upload, ou lazy côté serveur).
 * Cache + concurrence partagés pour ne pas saturer le réseau mobile.
 */
export async function fetchResourceCoverBlob(id) {
  return getCachedBlob(`resource-cover:${id}`, () =>
    fetchResourceFileBlobOnce(ENDPOINTS.resources.cover(String(id)), false),
  )
}

async function fetchResourceFileBlobOnce(path, retried) {
  const token = getToken()
  const controller = new AbortController()
  // Aperçu / téléchargement PDF : plus long que le timeout API standard (15 s).
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(resolveApiPath(path), {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
    if (res.status === 401 && !retried) {
      await refreshAccessToken()
      return fetchResourceFileBlobOnce(path, true)
    }
    if (!res.ok) {
      throw new Error('file_unavailable')
    }
    const blob = await res.blob()
    const type = String(blob.type || '').toLowerCase()
    if (type.includes('text/html')) throw new Error('file_unavailable')
    return blob
  } finally {
    clearTimeout(timer)
  }
}

/** POST /resources — multipart admin */
export async function createResource({ title, categoryId, language, description, file }) {
  const formData = new FormData()
  formData.append('title', title || '')
  formData.append('categoryId', categoryId || '')
  formData.append('language', language || '')
  formData.append('description', description || '')
  formData.append('file', file)
  const data = await appApiFetch(ENDPOINTS.resources.list, {
    method: 'POST',
    auth: true,
    body: formData,
    // Upload PDF jusqu’à 15 Mo : 15 s est trop court sur une connexion moyenne.
    timeoutMs: 120_000,
  })
  return mapResource(data)
}

/** PATCH /resources/{id} */
export async function updateResource(id, patch) {
  const data = await appApiFetch(ENDPOINTS.resources.detail(String(id)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(patch),
  })
  return mapResource(data)
}

/** DELETE /resources/{id} — suppression définitive (admin) */
export async function deleteResource(id) {
  return appApiFetch(ENDPOINTS.resources.detail(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}
