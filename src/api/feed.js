import { apiFetch } from './client'
import {
  createActivity,
  fetchActivities,
  favoriteActivity,
  mapActivity,
  postComment,
} from './activity'
import { createRecit, getRecits, updateRecitStatus } from './recits'

/**
 * Couche Feed unifiée.
 * - Priorité CPT `recits` si enregistré sur WP
 * - Sinon BuddyPress Activity (Hostinger actuel : pas de CPT récits)
 */

let recitsAvailable = null

/** @returns {Promise<boolean>} */
export async function detectRecitsCpt() {
  if (recitsAvailable !== null) return recitsAvailable
  try {
    await apiFetch('/wp/v2/types/recit', { skipAuth: true, suppressUnauthorized: true })
    recitsAvailable = true
  } catch (err) {
    if (err?.status === 404) {
      recitsAvailable = false
    } else {
      // Erreur réseau / 5xx : ne pas figer le cache, retenter plus tard
      recitsAvailable = null
      return false
    }
  }
  return Boolean(recitsAvailable)
}

/** Force un nouveau probe (après déploiement CPT). */
export function resetRecitsDetection() {
  recitsAvailable = null
}

/**
 * @param {object} filtres
 */
export async function getFeedItems(filtres = {}) {
  const {
    page = 1,
    perPage = 10,
    scope = 'all',
    search = '',
    author,
    status,
    pays = '',
    langue = '',
    thematique = '',
  } = filtres

  if (await detectRecitsCpt()) {
    let recitStatus = status
    if (!recitStatus) {
      if (scope === 'pending') recitStatus = 'pending'
      else if (scope === 'just-me') recitStatus = 'publish,pending,draft'
      else recitStatus = 'publish'
    }

    return getRecits({
      page,
      perPage,
      status: recitStatus,
      search,
      author,
      pays,
      langue,
      thematique,
    })
  }

  const list = await fetchActivities({
    page,
    perPage,
    scope: scope === 'pending' ? 'just-me' : scope === 'favorites' ? 'favorites' : scope === 'all' ? 'all' : scope,
    search,
  })

  if (scope === 'pending') return list.filter((a) => a.status === 'pending')
  if (scope === 'favorites') return list.filter((a) => a.favorited)
  if (scope === 'groups') return list.filter((a) => a.component === 'groups')
  if (scope === 'just-me' && author != null) {
    return list.filter((a) => String(a.userId) === String(author))
  }
  if (scope === 'all') {
    return list.filter((a) => !a.status || a.status === 'published' || a.status === 'publish')
  }
  return list
}

/**
 * @param {object} payload
 */
export async function createFeedItem(payload = {}) {
  if (await detectRecitsCpt()) {
    return createRecit(payload)
  }

  const {
    title = '',
    content = '',
    status = 'pending',
    consent = false,
    anonymous = false,
    tags = {},
    media = [],
  } = payload

  const bodyContent = title ? `${title}\n\n${content}` : content

  return createActivity({
    content: bodyContent,
    title,
    privacy: 'public',
    status,
    consent,
    anonymous,
    tags,
    media,
  })
}

export async function getPendingFeedItems({ page = 1, perPage = 10 } = {}) {
  if (await detectRecitsCpt()) {
    return getRecits({ page, perPage, status: 'pending' })
  }

  const list = await fetchActivities({ page, perPage, scope: 'all' })
  return list.filter((a) => a.status === 'pending')
}

export async function moderateFeedItem(id, { action, comment = '' } = {}) {
  if (await detectRecitsCpt()) {
    const statut = action === 'approve' ? 'publish' : 'draft'
    const updated = await updateRecitStatus(id, statut)
    if (comment) {
      try {
        await apiFetch(`/afrea/v1/moderation/stories/${id}`, {
          method: 'POST',
          body: JSON.stringify({ action, comment }),
        })
      } catch {
        /* endpoint custom optionnel */
      }
    }
    return updated
  }

  const publicationStatus = action === 'approve' ? 'published' : 'rejected'
  const body = {
    meta: {
      publication_status: publicationStatus,
      moderation_comment: comment,
    },
  }

  try {
    const data = await apiFetch(`/buddypress/v1/activity/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    return mapActivity(data)
  } catch {
    const data = await apiFetch(`/buddypress/v1/activity/${id}`, {
      method: 'POST',
      body: JSON.stringify({ id, ...body }),
    })
    return mapActivity(data)
  }
}

export { favoriteActivity, postComment }
