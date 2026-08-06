import { ENABLE_BUDDYPRESS } from '../config/api'
import { apiFetch } from './client'

const BASE = '/buddypress/v1/groups'

export function mapGroup(item) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description?.rendered || item.description || '',
    status: item.status || 'public',
    avatar: item.avatar_urls?.full || item.avatar_urls?.thumb || null,
    cover: item.cover_url || null,
    membersCount: item.total_member_count ?? item.member_count ?? 0,
    lastActive: item.last_activity || item.date_modified || null,
    created: item.date_created || null,
    isMember: Boolean(item.is_member),
    isAdmin: Boolean(item.is_admin),
    isMod: Boolean(item.is_mod),
    memberIds: item.member_ids || [],
    admins: item.admins || [],
  }
}

export async function fetchGroups({ page = 1, perPage = 12, search = '', type = 'active', token } = {}) {
  if (!ENABLE_BUDDYPRESS) return []
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    type,
  })
  if (search) params.set('search', search)
  const data = await apiFetch(`${BASE}?${params}`, { token })
  const list = Array.isArray(data) ? data : data?.groups || []
  return list.map(mapGroup)
}

export async function fetchGroup(id, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  const data = await apiFetch(`${BASE}/${id}`, { token })
  return mapGroup(data)
}

export async function joinGroup(id, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${id}/members`, { method: 'POST', token })
}

export async function leaveGroup(id, { token, userId } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${id}/members/${userId}`, { method: 'DELETE', token })
}

export async function inviteToGroup(groupId, userIds, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${groupId}/invites`, {
    method: 'POST',
    token,
    body: JSON.stringify({ user_ids: userIds }),
  })
}
