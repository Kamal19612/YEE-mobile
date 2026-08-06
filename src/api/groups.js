import { ENDPOINTS } from '../config/api'
import { appApiFetch, getToken } from './client'

/**
 * Groups — App API `/app/v1/groups/*`
 *
 * Note : `normalizeMediaUrl` n’est pas exporté par `users.js` (hors périmètre).
 * Même logique locale que `feed.js`.
 */
function normalizeMediaUrl(url) {
  if (!url) return null
  let u = String(url).replace(/#038;/g, '&').replace(/&amp;/g, '&')
  if (u.startsWith('//')) u = `https:${u}`
  return u
}

const VISIBILITIES = new Set(['public', 'private', 'secret'])
const VIEWER_STATUSES = new Set(['active', 'pending', 'invited', 'banned', 'none'])
const VIEWER_ROLES = new Set(['member', 'moderator', 'admin'])
const MEMBER_STATUSES = new Set(['active', 'pending', 'invited', 'banned'])

function mapUser(raw) {
  if (!raw || typeof raw !== 'object') {
    return { id: '', displayName: '', avatarUrl: null, profession: '' }
  }
  return {
    id: String(raw.id ?? ''),
    displayName: raw.displayName || '',
    avatarUrl: normalizeMediaUrl(raw.avatarUrl || raw.avatar),
    profession: raw.profession || '',
  }
}

/** Normalise un groupe App API — `viewerStatus` / `viewerRole` viennent du serveur. */
export function mapGroup(raw) {
  if (!raw || typeof raw !== 'object') return null

  const visibility = VISIBILITIES.has(raw.visibility)
    ? raw.visibility
    : VISIBILITIES.has(raw.status)
      ? raw.status
      : 'public'

  const viewerStatus = VIEWER_STATUSES.has(raw.viewerStatus) ? raw.viewerStatus : 'none'
  const viewerRole = VIEWER_ROLES.has(raw.viewerRole) ? raw.viewerRole : null

  return {
    id: String(raw.id ?? ''),
    name: raw.name || '',
    slug: raw.slug || '',
    description: typeof raw.description === 'string' ? raw.description : '',
    coverUrl: normalizeMediaUrl(raw.coverUrl || raw.cover),
    visibility,
    membersCount: Number(raw.membersCount) || 0,
    createdAt: raw.createdAt || raw.created || '',
    viewerStatus,
    viewerRole,
  }
}

export function mapMember(raw) {
  if (!raw || typeof raw !== 'object') return null
  const role = VIEWER_ROLES.has(raw.role) ? raw.role : 'member'
  const status = MEMBER_STATUSES.has(raw.status) ? raw.status : 'active'
  return {
    user: mapUser(raw.user),
    role,
    status,
    joinedAt: raw.joinedAt || '',
  }
}

function authOpts() {
  const token = getToken()
  return token ? { auth: true } : { skipAuth: true }
}

/** GET /groups?search=&mine= */
export async function fetchGroups({ search = '', mine = false } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', String(search))
  if (mine) params.set('mine', '1')

  const qs = params.toString()
  const path = qs ? `${ENDPOINTS.groups.list}?${qs}` : ENDPOINTS.groups.list
  const data = await appApiFetch(path, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapGroup).filter(Boolean)
}

/** GET /groups/{id} — 404 si secret et non-membre */
export async function fetchGroup(id) {
  const data = await appApiFetch(ENDPOINTS.groups.detail(String(id)), authOpts())
  return mapGroup(data)
}

/** POST /groups — body: { name, description?, visibility } */
export async function createGroup({ name, description, visibility = 'public' } = {}) {
  const data = await appApiFetch(ENDPOINTS.groups.list, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      name,
      description: description || '',
      visibility,
    }),
  })
  return mapGroup(data)
}

/** PATCH /groups/{id} */
export async function updateGroup(id, { name, description, visibility } = {}) {
  const body = {}
  if (name != null) body.name = name
  if (description != null) body.description = description
  if (visibility != null) body.visibility = visibility
  const data = await appApiFetch(ENDPOINTS.groups.detail(String(id)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(body),
  })
  return mapGroup(data)
}

/** DELETE /groups/{id} */
export async function deleteGroup(id) {
  return appApiFetch(ENDPOINTS.groups.detail(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/**
 * POST /groups/{id}/join
 * @returns {{ status: string }}
 */
export async function joinGroup(id) {
  const data = await appApiFetch(ENDPOINTS.groups.join(String(id)), {
    method: 'POST',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'active' }
}

/** DELETE /groups/{id}/membership */
export async function leaveGroup(id) {
  const data = await appApiFetch(ENDPOINTS.groups.membership(String(id)), {
    method: 'DELETE',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'none' }
}

/** POST /groups/{id}/invitations — body: { userId } */
export async function inviteToGroup(id, userId) {
  const data = await appApiFetch(ENDPOINTS.groups.invitations(String(id)), {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ userId: String(userId) }),
  })
  return data && typeof data === 'object' ? data : { status: 'invited' }
}

/** POST /groups/{id}/invitations/respond — body: { accept } */
export async function respondToInvitation(id, accept) {
  const data = await appApiFetch(ENDPOINTS.groups.respondInvitation(String(id)), {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ accept: Boolean(accept) }),
  })
  return data && typeof data === 'object' ? data : { status: accept ? 'active' : 'none' }
}

/** GET /groups/{id}/members?status= */
export async function fetchGroupMembers(id, { status = 'active' } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', String(status))
  const qs = params.toString()
  const base = ENDPOINTS.groups.members(String(id))
  const path = qs ? `${base}?${qs}` : base
  const data = await appApiFetch(path, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapMember).filter(Boolean)
}

/** POST /groups/{id}/members/{userId}/approve */
export async function approveMember(id, userId) {
  const data = await appApiFetch(ENDPOINTS.groups.approveMember(String(id), String(userId)), {
    method: 'POST',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'active' }
}

/** POST /groups/{id}/members/{userId}/reject */
export async function rejectMember(id, userId) {
  const data = await appApiFetch(ENDPOINTS.groups.rejectMember(String(id), String(userId)), {
    method: 'POST',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'none' }
}

/** DELETE /groups/{id}/members/{userId} */
export async function removeMember(id, userId) {
  return appApiFetch(ENDPOINTS.groups.removeMember(String(id), String(userId)), {
    method: 'DELETE',
    auth: true,
  })
}

/** PATCH /groups/{id}/members/{userId}/role — body: { role } */
export async function changeMemberRole(id, userId, role) {
  const data = await appApiFetch(ENDPOINTS.groups.changeMemberRole(String(id), String(userId)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify({ role }),
  })
  return data && typeof data === 'object' ? data : { role }
}
