import { ENDPOINTS } from '../config/api'
import { appApiFetch, getToken, refreshAccessToken } from './client'

/**
 * Feed — App API `/app/v1/feed/*`
 *
 * Note : `normalizeMediaUrl` n’est pas exporté par `users.js` (hors périmètre).
 * Même logique locale pour les avatarUrl WordPress (`#038;` / `&amp;`).
 */
function normalizeMediaUrl(url) {
  if (!url) return null
  let u = String(url).replace(/#038;/g, '&').replace(/&amp;/g, '&')
  if (u.startsWith('//')) u = `https:${u}`
  // Anciennes URLs stockées avec le host de dev — le proxy Apache/Vite sert /media.
  u = u.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+\/media(?=\/|$)/i, '/media')
  return u
}

function mapAuthor(raw) {
  if (!raw || typeof raw !== 'object') {
    return { id: '', displayName: '', avatarUrl: null, profession: '' }
  }
  return {
    id: String(raw.id ?? ''),
    displayName: raw.displayName || '',
    avatarUrl: normalizeMediaUrl(raw.avatarUrl),
    profession: raw.profession || '',
  }
}

/** Validation client (UX) — la sécurité réelle est côté UploadValidator WP. */
export const FEED_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const FEED_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const FEED_IMAGE_MAX_COUNT = 4
export const FEED_AUDIO_ACCEPT =
  'audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/webm,audio/wav,audio/wave,audio/x-wav,audio/x-m4a'
export const FEED_AUDIO_MAX_BYTES = 20 * 1024 * 1024
export const FEED_AUDIO_MAX_COUNT = 1
export const FEED_DOCUMENT_ACCEPT = 'application/pdf,.pdf'
export const FEED_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024
export const FEED_DOCUMENT_MAX_COUNT = 1

const FEED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FEED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/x-m4a',
]
const FEED_DOCUMENT_TYPES = ['application/pdf']

/** MediaRecorder ajoute souvent `;codecs=opus` — on compare le type de base. */
function mediaBaseType(file) {
  return String(file?.type || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
}

function isFeedImage(file) {
  return file && FEED_IMAGE_TYPES.includes(mediaBaseType(file))
}

function isFeedAudio(file) {
  return file && FEED_AUDIO_TYPES.includes(mediaBaseType(file))
}

function isFeedDocument(file) {
  if (!file) return false
  if (FEED_DOCUMENT_TYPES.includes(mediaBaseType(file))) return true
  // Certains OS envoient un type vide pour les PDF.
  return !mediaBaseType(file) && /\.pdf$/i.test(String(file.name || ''))
}

/**
 * Valide un lot de fichiers avant envoi.
 * @returns {string|null} message d’erreur, ou null si OK
 */
export function validateFeedMedia(files) {
  const list = Array.isArray(files) ? files.filter(Boolean) : []
  if (!list.length) return null

  const images = list.filter(isFeedImage)
  const audios = list.filter(isFeedAudio)
  const documents = list.filter(isFeedDocument)
  const other = list.filter((f) => !isFeedImage(f) && !isFeedAudio(f) && !isFeedDocument(f))

  if (other.length) {
    return 'Formats acceptés : JPEG, PNG, WebP, audio (MP3, M4A, AAC, WAV, OGG, WebM) ou PDF.'
  }
  const kinds = (images.length ? 1 : 0) + (audios.length ? 1 : 0) + (documents.length ? 1 : 0)
  if (kinds > 1) {
    return 'Images, audio et document ne peuvent pas être combinés dans le même post.'
  }
  if (images.length > FEED_IMAGE_MAX_COUNT) return `Maximum ${FEED_IMAGE_MAX_COUNT} images par post.`
  if (audios.length > FEED_AUDIO_MAX_COUNT) return 'Un seul fichier audio par post.'
  if (documents.length > FEED_DOCUMENT_MAX_COUNT) return 'Un seul document PDF par post.'

  for (const file of images) {
    if (file.size > FEED_IMAGE_MAX_BYTES) return 'Chaque image ne doit pas dépasser 5 Mo.'
  }
  for (const file of audios) {
    if (file.size > FEED_AUDIO_MAX_BYTES) return 'Le fichier audio ne doit pas dépasser 20 Mo.'
  }
  for (const file of documents) {
    if (file.size > FEED_DOCUMENT_MAX_BYTES) return 'Le document PDF ne doit pas dépasser 15 Mo.'
  }
  return null
}

/** Médias de groupe private/secret : pas d'URL de stockage, le jeton est obligatoire. */
export function isProtectedPostMedia(url) {
  return typeof url === 'string' && /^\/(?:api\/)?feed\/\d+\/media\/\d+$/.test(url)
}

/** Chemins same-origin servis par l’API (protégés ou publics post-media). */
export function isPostMediaPath(url) {
  return (
    isProtectedPostMedia(url) ||
    (typeof url === 'string' &&
      /^\/(?:api\/)?media\/(?:post-media|group-post-media)\/\d+\/[^/?#]+$/.test(url))
  )
}

/** Normalise une URL média legacy (`/feed/…`, `/media/post-media/…`) vers `/api/…`. */
export function resolvePostMediaUrl(url) {
  if (typeof url !== 'string' || !url) return url
  if (url.startsWith('http') || url.startsWith('/api/')) return url
  if (/^\/feed\/\d+\/media\/\d+$/.test(url) || /^\/media\/(?:post-media|group-post-media)\//.test(url)) {
    return `/api${url}`
  }
  return url
}

/**
 * Télécharge un média de publication en blob (évite qu’un iframe PDF
 * reçoive le HTML de la SPA à cause de Accept: text/html).
 */
export async function fetchPostMediaBlob(path) {
  const resolved = resolvePostMediaUrl(path)
  if (!isPostMediaPath(resolved) && !isPostMediaPath(path)) {
    throw new Error('Média introuvable')
  }
  return fetchPostMediaBlobOnce(resolved, false)
}

async function fetchPostMediaBlobOnce(path, retried) {
  const token = getToken()
  const controller = new AbortController()
  // Documents PDF : timeout plus long (miroir ressources).
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(path, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
    if (res.status === 401 && !retried) {
      await refreshAccessToken()
      return fetchPostMediaBlobOnce(path, true)
    }
    if (!res.ok) {
      throw new Error('Média introuvable')
    }
    return await res.blob()
  } finally {
    clearTimeout(timer)
  }
}

function mapMediaItem(m) {
  if (!m || typeof m !== 'object') return null
  const type =
    m.type === 'audio' || m.type === 'image' || m.type === 'document' ? m.type : null
  if (!type) return null
  const url = normalizeMediaUrl(m.url)
  return {
    id: String(m.id ?? ''),
    type,
    url,
    filename: m.filename || m.originalFilename || m.original_filename || null,
    byteSize:
      m.byteSize != null
        ? Number(m.byteSize)
        : m.byte_size != null
          ? Number(m.byte_size)
          : null,
    contentType: m.contentType || m.content_type || guessMimeFromUrl(url, type),
  }
}

function guessMimeFromUrl(url, type) {
  const path = String(url || '').split('?')[0].toLowerCase()
  if (path.endsWith('.webm')) return 'audio/webm'
  if (path.endsWith('.ogg')) return 'audio/ogg'
  if (path.endsWith('.m4a') || path.endsWith('.mp4')) return 'audio/mp4'
  if (path.endsWith('.mp3')) return 'audio/mpeg'
  if (path.endsWith('.wav')) return 'audio/wav'
  if (path.endsWith('.pdf')) return 'application/pdf'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (type === 'document') return 'application/pdf'
  return type === 'audio' ? '' : ''
}

function mapPost(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: String(raw.id),
    author: mapAuthor(raw.author),
    content: typeof raw.content === 'string' ? raw.content : '',
    likesCount: Number(raw.likesCount) || 0,
    commentsCount: Number(raw.commentsCount) || 0,
    createdAt: raw.createdAt || '',
    viewerHasLiked: Boolean(raw.viewerHasLiked),
    // isOwnPost : source serveur uniquement — ne pas recalculer côté client
    isOwnPost: Boolean(raw.isOwnPost),
    media: Array.isArray(raw.media)
      ? raw.media.map(mapMediaItem).filter(Boolean)
      : [],
  }
}

function mapComment(raw) {
  if (!raw || typeof raw !== 'object') return null
  const parentRaw = raw.parentId ?? raw.parent_id
  return {
    id: String(raw.id),
    parentId: parentRaw != null && String(parentRaw).trim() !== '' ? String(parentRaw) : null,
    author: mapAuthor(raw.author),
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt: raw.createdAt || '',
    replyToName: raw.replyToName || raw.reply_to_name || null,
    replies: Array.isArray(raw.replies) ? raw.replies.map(mapComment).filter(Boolean) : [],
  }
}

/** Reconstruit le fil si l’API renvoie une liste plate avec parentId. */
export function nestCommentTree(comments) {
  const items = (Array.isArray(comments) ? comments : []).map((c) => ({
    ...c,
    replies: [...(c.replies || [])],
  }))
  const byId = new Map(items.map((c) => [String(c.id), c]))
  const childIds = new Set()
  for (const c of items) {
    if (!c.parentId || !byId.has(String(c.parentId)) || String(c.parentId) === String(c.id)) {
      continue
    }
    const parent = byId.get(String(c.parentId))
    if (!parent.replies.some((r) => String(r.id) === String(c.id))) {
      if (!c.replyToName && parent.author?.displayName) {
        c.replyToName = parent.author.displayName
      }
      parent.replies.push(c)
    }
    childIds.add(String(c.id))
  }
  return items.filter((c) => !childIds.has(String(c.id)))
}

function mapLiker(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.userId ?? raw.user_id
  if (id == null || id === '') return null
  return {
    id: String(id),
    displayName: raw.displayName || raw.display_name || raw.name || '',
    avatarUrl: normalizeMediaUrl(raw.avatarUrl || raw.avatar_url || raw.avatar),
    profession: raw.profession || '',
    likedAt: raw.likedAt || raw.liked_at || raw.createdAt || '',
  }
}

function authOpts() {
  const token = getToken()
  return token ? { auth: true } : { skipAuth: true }
}

/**
 * GET /feed — pagination curseur (`before` = id du dernier post chargé).
 *
 * `appApiFetch` ne renvoie que `body.data` et ignore `meta` (voir signalement client.js).
 * Tant que `meta.nextCursor` n’est pas préservé, on dérive le curseur du dernier id
 * quand la page est pleine ; `null` si moins de `perPage` items.
 *
 * @returns {Promise<{ posts: object[], nextCursor: string|null }>}
 */
export async function fetchFeed({ before, perPage = 10, authorId, groupId } = {}) {
  const params = new URLSearchParams()
  if (before) params.set('before', String(before))
  if (perPage != null) params.set('perPage', String(perPage))
  if (authorId != null && authorId !== '') params.set('authorId', String(authorId))
  if (groupId != null && groupId !== '') params.set('groupId', String(groupId))

  const qs = params.toString()
  const path = qs ? `${ENDPOINTS.feed.list}?${qs}` : ENDPOINTS.feed.list
  const data = await appApiFetch(path, authOpts())

  const list = Array.isArray(data) ? data : []
  const posts = list.map(mapPost).filter(Boolean)
  const nextCursor =
    posts.length > 0 && posts.length >= perPage ? posts[posts.length - 1].id : null

  return { posts, nextCursor }
}

/**
 * POST /feed — JSON `{ content }` ou multipart (content + media Files).
 * Ne pas fixer Content-Type sur FormData : le navigateur pose le boundary.
 */
export async function createPost({ content, media, groupId, onProgress } = {}) {
  const files = Array.isArray(media) ? media.filter(Boolean) : []
  const gid = groupId != null && groupId !== '' ? String(groupId) : null

  if (files.length > 0) {
    const formData = new FormData()
    formData.append('content', content || '')
    if (gid) formData.append('groupId', gid)
    // Backend : images → "media" ; audio → "audio" ; PDF → "document".
    files.forEach((file) => {
      const type = String(file.type || '')
        .split(';')[0]
        .trim()
        .toLowerCase()
      if (type.startsWith('audio/')) formData.append('audio', file)
      else if (type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
        formData.append('document', file)
      } else formData.append('media', file)
    })
    const data = await appApiFetch(ENDPOINTS.feed.list, {
      method: 'POST',
      auth: true,
      body: formData,
      // Aligné sur createResource : PDF jusqu’à 15 Mo, le défaut 15 s coupe trop tôt.
      timeoutMs: 120_000,
      onUploadProgress: typeof onProgress === 'function' ? onProgress : undefined,
    })
    return mapPost(data)
  }

  const body = { content }
  if (gid) body.groupId = gid

  const data = await appApiFetch(ENDPOINTS.feed.list, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  })
  return mapPost(data)
}

/** GET /feed/{id} */
export async function fetchPost(id) {
  const data = await appApiFetch(ENDPOINTS.feed.detail(String(id)), authOpts())
  return mapPost(data)
}

/** DELETE /feed/{id} */
export async function deletePost(id) {
  return appApiFetch(ENDPOINTS.feed.detail(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/** POST /feed/{id}/like */
export async function likePost(id) {
  return appApiFetch(ENDPOINTS.feed.like(String(id)), {
    method: 'POST',
    auth: true,
  })
}

/** DELETE /feed/{id}/like */
export async function unlikePost(id) {
  return appApiFetch(ENDPOINTS.feed.like(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/**
 * GET /feed/{id}/comments?before=
 * Même limitation meta que fetchFeed.
 * @returns {Promise<{ comments: object[], nextCursor: string|null }>}
 */
export async function fetchComments(postId, { before, perPage = 20 } = {}) {
  const params = new URLSearchParams()
  if (before) params.set('before', String(before))
  if (perPage != null) params.set('perPage', String(perPage))

  const qs = params.toString()
  const base = ENDPOINTS.feed.comments(String(postId))
  const path = qs ? `${base}?${qs}` : base
  const data = await appApiFetch(path, authOpts())

  const list = Array.isArray(data) ? data : []
  const comments = nestCommentTree(list.map(mapComment).filter(Boolean))
  const nextCursor =
    comments.length > 0 && comments.length >= perPage
      ? comments[comments.length - 1].id
      : null

  return { comments, nextCursor }
}

/** POST /feed/{id}/comments — body: { content, parentId? } */
export async function createComment(postId, { content, parentId }) {
  const body = { content }
  if (parentId != null && parentId !== '') body.parentId = String(parentId)
  const data = await appApiFetch(ENDPOINTS.feed.comments(String(postId)), {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  })
  return mapComment(data)
}

/**
 * GET /feed/{id}/likers?before=
 * `before` = likedAt ISO du dernier item (curseur).
 */
export async function fetchPostLikers(postId, { before, perPage = 20 } = {}) {
  const params = new URLSearchParams()
  if (before) params.set('before', String(before))
  if (perPage != null) params.set('perPage', String(perPage))

  const qs = params.toString()
  const base = ENDPOINTS.feed.likers(String(postId))
  const path = qs ? `${base}?${qs}` : base
  const data = await appApiFetch(path, authOpts())

  const list = Array.isArray(data) ? data : []
  const likers = list.map(mapLiker).filter(Boolean)
  const nextCursor =
    likers.length > 0 && likers.length >= perPage ? likers[likers.length - 1].likedAt : null

  return { likers, nextCursor }
}

/** DELETE /feed/comments/{commentId} */
export async function deleteComment(commentId) {
  return appApiFetch(ENDPOINTS.feed.deleteComment(String(commentId)), {
    method: 'DELETE',
    auth: true,
  })
}
