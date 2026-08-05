import { apiFetch } from './client'

/**
 * CPT « recit » — /wp/v2/recits
 * Champs ACF : pays, langue, thematique, consentement_donne, anonymise, type_media
 * Statuts : draft | pending | publish
 */

const BASE = '/wp/v2/recits'

const STATUS_MAP = {
  draft: 'draft',
  pending: 'pending',
  publish: 'published',
  published: 'published',
  rejected: 'rejected',
}

export function mapRecit(item) {
  const acf = item.acf || item.meta || {}
  const statusRaw = item.status || 'publish'
  const authorName =
    item._embedded?.author?.[0]?.name ||
    item.author_name ||
    (acf.anonymise || acf.anonymous ? 'Anonyme' : 'Member')

  const avatar =
    item._embedded?.author?.[0]?.avatar_urls?.['96'] ||
    item._embedded?.author?.[0]?.avatar_urls?.['48'] ||
    null

  const mediaType = acf.type_media || acf.media_type || ''
  const featured =
    item._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    item.featured_media_url ||
    null

  return {
    id: item.id,
    userId: item.author,
    userName: acf.anonymise || acf.anonymous ? 'Anonyme' : authorName,
    userLink: item.author ? `/members/${item.author}` : '#',
    avatar: acf.anonymise || acf.anonymous ? null : avatar,
    anonymous: Boolean(acf.anonymise ?? acf.anonymous),
    title: item.title?.rendered || item.title || acf.title || '',
    content: item.content?.rendered || item.content || '',
    date: item.date || item.date_gmt || new Date().toISOString(),
    component: 'activity',
    type: 'story',
    privacy: 'public',
    status: STATUS_MAP[statusRaw] || statusRaw,
    consent: Boolean(acf.consentement_donne ?? acf.consent),
    tags: {
      country: acf.pays || acf.country || '',
      thematic: acf.thematique || acf.thematic || '',
      language: acf.langue || acf.language || '',
    },
    favorited: false,
    favoriteCount: 0,
    commentCount: item.comment_count ?? 0,
    comments: [],
    group: null,
    media: featured
      ? [{ id: `media-${item.id}`, type: mediaType || 'image', url: featured }]
      : mediaType
        ? [{ id: `media-${item.id}`, type: mediaType }]
        : [],
    edited: Boolean(item.modified && item.modified !== item.date),
    wpStatus: statusRaw,
  }
}

/**
 * @param {object} filtres
 * @param {string} [filtres.status] draft|pending|publish
 * @param {string} [filtres.search]
 * @param {string} [filtres.pays]
 * @param {string} [filtres.langue]
 * @param {string} [filtres.thematique]
 * @param {number} [filtres.author]
 * @param {number} [filtres.page]
 * @param {number} [filtres.perPage]
 */
export async function getRecits(filtres = {}) {
  const {
    page = 1,
    perPage = 10,
    status = 'publish',
    search = '',
    pays = '',
    langue = '',
    thematique = '',
    author,
  } = filtres

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status,
    _embed: '1',
  })
  if (search) params.set('search', search)
  if (author) params.set('author', String(author))
  if (pays) params.set('pays', pays)
  if (langue) params.set('langue', langue)
  if (thematique) params.set('thematique', thematique)

  const data = await apiFetch(`${BASE}?${params}`, {
    // publish = public ; draft/pending = JWT requis
    skipAuth: status === 'publish',
    auth: status !== 'publish',
  })
  const list = Array.isArray(data) ? data : data?.recits || []
  return list.map(mapRecit)
}

export async function getRecit(id) {
  const data = await apiFetch(`${BASE}/${id}?_embed=1`, { skipAuth: true })
  return mapRecit(data)
}

/**
 * @param {object} payload
 */
export async function createRecit(payload = {}) {
  const {
    title = '',
    content = '',
    status = 'pending',
    consent = false,
    anonymous = false,
    tags = {},
    mediaType = '',
  } = payload

  const wpStatus = status === 'published' ? 'publish' : status === 'draft' ? 'draft' : 'pending'

  const data = await apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      status: wpStatus,
      acf: {
        pays: tags.country || '',
        langue: tags.language || '',
        thematique: tags.thematic || '',
        consentement_donne: Boolean(consent),
        anonymise: Boolean(anonymous),
        type_media: mediaType || (payload.media?.[0]?.type ?? ''),
      },
    }),
  })
  return mapRecit(data)
}

/**
 * @param {number|string} id
 * @param {'draft'|'pending'|'publish'|'published'|'rejected'} statut
 */
export async function updateRecitStatus(id, statut) {
  let wpStatus = statut
  if (statut === 'published' || statut === 'approve') wpStatus = 'publish'
  if (statut === 'rejected') wpStatus = 'draft'
  if (statut === 'pending') wpStatus = 'pending'

  const data = await apiFetch(`${BASE}/${id}`, {
    method: 'POST',
    body: JSON.stringify({ status: wpStatus }),
  })
  return mapRecit(data)
}
