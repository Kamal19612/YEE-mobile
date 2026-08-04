import { apiFetch } from './client'
import { mapActivity } from './activity'

/**
 * File de modération pré-publication (hors BuddyBoss — exigence TDR §1.2, §8)
 * Endpoints custom attendus côté WP headless.
 */

const BASE = '/afrea/v1/moderation'

export async function fetchPendingStories({ page = 1, perPage = 10, token } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    status: 'pending',
  })
  const data = await apiFetch(`${BASE}/stories?${params}`, { token })
  const list = Array.isArray(data) ? data : data?.stories || []
  return list.map(mapActivity)
}

export async function moderateStory(id, { action, comment = '', token } = {}) {
  const data = await apiFetch(`${BASE}/stories/${id}`, {
    method: 'POST',
    token,
    body: JSON.stringify({ action, comment }),
  })
  return mapActivity(data)
}
