import { ENABLE_BUDDYPRESS } from '../config/api'
import { apiFetch } from './client'
import { fetchMembers } from './members'
import { fetchGroups } from './groups'
import { fetchForums, fetchTopics } from './forums'

/**
 * Recherche globale — BuddyBoss/BuddyPress désactivés.
 * Sans ENABLE_BUDDYPRESS : résultats vides (pas d’appel réseau BP).
 */

export async function globalSearch(query, { token } = {}) {
  const q = query.trim()
  if (!q) {
    return { members: [], groups: [], forums: [], topics: [], posts: [], activity: [] }
  }

  if (!ENABLE_BUDDYPRESS) {
    return { members: [], groups: [], forums: [], topics: [], posts: [], activity: [] }
  }

  try {
    const data = await apiFetch(`/buddyboss/v1/search?search=${encodeURIComponent(q)}`, { token })
    if (data && typeof data === 'object') return data
  } catch {
    /* aggregate fallback */
  }

  const [members, groups, forums] = await Promise.allSettled([
    fetchMembers({ search: q, token }),
    fetchGroups({ search: q, token }),
    fetchForums({ token }),
  ])

  const memberList = members.status === 'fulfilled' ? members.value : []
  const groupList = groups.status === 'fulfilled' ? groups.value : []
  let forumList = forums.status === 'fulfilled' ? forums.value : []
  forumList = forumList.filter(
    (f) =>
      f.title.toLowerCase().includes(q.toLowerCase()) ||
      f.description.toLowerCase().includes(q.toLowerCase()),
  )

  let topics = []
  try {
    const allTopics = await Promise.all(forumList.slice(0, 3).map((f) => fetchTopics(f.id, { token })))
    topics = allTopics.flat().filter((t) => t.title.toLowerCase().includes(q.toLowerCase()))
  } catch {
    topics = []
  }

  return {
    members: memberList,
    groups: groupList,
    forums: forumList,
    topics,
    posts: [],
    activity: [],
  }
}
