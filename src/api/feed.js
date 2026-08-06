import { ENDPOINTS } from '../config/api'
import { appApiFetch, getToken } from './client'

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
export const FEED_AUDIO_ACCEPT = 'audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/webm'
export const FEED_AUDIO_MAX_BYTES = 20 * 1024 * 1024
export const FEED_AUDIO_MAX_COUNT = 1

const FEED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FEED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm']

function isFeedImage(file) {
  return file && FEED_IMAGE_TYPES.includes(file.type)
}

function isFeedAudio(file) {
  return file && FEED_AUDIO_TYPES.includes(file.type)
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
  const other = list.filter((f) => !isFeedImage(f) && !isFeedAudio(f))

  if (other.length) return 'Formats acceptés : JPEG, PNG, WebP ou audio (MP3, M4A, AAC, OGG, WebM).'
  if (images.length && audios.length) return 'Images et audio ne peuvent pas être combinés dans le même post.'
  if (images.length > FEED_IMAGE_MAX_COUNT) return `Maximum ${FEED_IMAGE_MAX_COUNT} images par post.`
  if (audios.length > FEED_AUDIO_MAX_COUNT) return 'Un seul fichier audio par post.'

  for (const file of images) {
    if (file.size > FEED_IMAGE_MAX_BYTES) return 'Chaque image ne doit pas dépasser 5 Mo.'
  }
  for (const file of audios) {
    if (file.size > FEED_AUDIO_MAX_BYTES) return 'Le fichier audio ne doit pas dépasser 20 Mo.'
  }
  return null
}

function mapMediaItem(m) {
  if (!m || typeof m !== 'object') return null
  const type = m.type === 'audio' ? 'audio' : m.type === 'image' ? 'image' : null
  if (!type) return null
  return {
    id: String(m.id ?? ''),
    type,
    url: normalizeMediaUrl(m.url),
  }
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
  return {
    id: String(raw.id),
    author: mapAuthor(raw.author),
    content: typeof raw.content === 'string' ? raw.content : '',
    createdAt: raw.createdAt || '',
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
export async function fetchFeed({ before, perPage = 10, authorId } = {}) {
  const params = new URLSearchParams()
  if (before) params.set('before', String(before))
  if (perPage != null) params.set('perPage', String(perPage))
  if (authorId != null && authorId !== '') params.set('authorId', String(authorId))

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
export async function createPost({ content, media } = {}) {
  const files = Array.isArray(media) ? media.filter(Boolean) : []

  if (files.length > 0) {
    const formData = new FormData()
    formData.append('content', content || '')
    files.forEach((file) => formData.append('media', file))
    const data = await appApiFetch(ENDPOINTS.feed.list, {
      method: 'POST',
      auth: true,
      body: formData,
    })
    return mapPost(data)
  }

  const data = await appApiFetch(ENDPOINTS.feed.list, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ content }),
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
  const comments = list.map(mapComment).filter(Boolean)
  const nextCursor =
    comments.length > 0 && comments.length >= perPage
      ? comments[comments.length - 1].id
      : null

  return { comments, nextCursor }
}

/** POST /feed/{id}/comments — body: { content } */
export async function createComment(postId, { content }) {
  const data = await appApiFetch(ENDPOINTS.feed.comments(String(postId)), {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ content }),
  })
  return mapComment(data)
}

/** DELETE /feed/comments/{commentId} */
export async function deleteComment(commentId) {
  return appApiFetch(ENDPOINTS.feed.deleteComment(String(commentId)), {
    method: 'DELETE',
    auth: true,
  })
}
