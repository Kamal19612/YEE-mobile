/**
 * Modération via CPT récits (statuts pending → publish | draft)
 */
import { getRecits, mapRecit, updateRecitStatus } from './recits'
import { apiFetch } from './client'

const CUSTOM_BASE = '/afrea/v1/moderation'

export async function fetchPendingStories({ page = 1, perPage = 10 } = {}) {
  try {
    return await getRecits({ page, perPage, status: 'pending' })
  } catch {
    /* fallback endpoint custom si CPT non encore filtré par status */
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      status: 'pending',
    })
    const data = await apiFetch(`${CUSTOM_BASE}/stories?${params}`)
    const list = Array.isArray(data) ? data : data?.stories || []
    return list.map(mapRecit)
  }
}

export async function moderateStory(id, { action, comment = '' } = {}) {
  const statut = action === 'approve' ? 'publish' : 'draft'
  try {
    const updated = await updateRecitStatus(id, statut)
    if (comment) {
      try {
        await apiFetch(`${CUSTOM_BASE}/stories/${id}`, {
          method: 'POST',
          body: JSON.stringify({ action, comment }),
        })
      } catch {
        /* commentaire optionnel si endpoint custom absent */
      }
    }
    return updated
  } catch (err) {
    const data = await apiFetch(`${CUSTOM_BASE}/stories/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    })
    return mapRecit(data)
  }
}
