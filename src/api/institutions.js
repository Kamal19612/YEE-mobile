import { ENDPOINTS } from '../config/api'
import { appApiFetch, getToken } from './client'

/**
 * Institutions — App API `/app/v1/institutions/*`
 * Hiérarchie continent → pays → club local ; affiliation validée par référents.
 */

function normalizeMediaUrl(url) {
  if (!url) return null
  let u = String(url).replace(/#038;/g, '&').replace(/&amp;/g, '&')
  if (u.startsWith('//')) u = `https:${u}`
  return u
}

const TYPES = new Set(['continent', 'country', 'local'])
const AFFILIATION_STATUSES = new Set(['active', 'pending', 'rejected', 'none'])
const LIST_AFFILIATION_STATUSES = new Set(['active', 'pending', 'rejected'])

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

/** Normalise une institution — `viewerAffiliationStatus` / `viewerIsReferent` viennent du serveur. */
export function mapInstitution(raw) {
  if (!raw || typeof raw !== 'object') return null

  const type = TYPES.has(raw.type) ? raw.type : 'local'
  const viewerAffiliationStatus = AFFILIATION_STATUSES.has(raw.viewerAffiliationStatus)
    ? raw.viewerAffiliationStatus
    : 'none'

  return {
    id: String(raw.id ?? ''),
    parentId: raw.parentId != null && raw.parentId !== '' ? String(raw.parentId) : null,
    type,
    name: raw.name || '',
    slug: raw.slug || '',
    description: typeof raw.description === 'string' ? raw.description : '',
    membersCount: Number(raw.membersCount) || 0,
    createdAt: raw.createdAt || raw.created || '',
    countryName: raw.countryName != null && raw.countryName !== '' ? String(raw.countryName) : null,
    continentName:
      raw.continentName != null && raw.continentName !== '' ? String(raw.continentName) : null,
    countryCode:
      raw.countryCode != null && raw.countryCode !== ''
        ? String(raw.countryCode).trim().toLowerCase()
        : raw.country_code != null && raw.country_code !== ''
          ? String(raw.country_code).trim().toLowerCase()
          : null,
    coverUrl: normalizeMediaUrl(raw.coverUrl || raw.cover),
    avatarUrl: normalizeMediaUrl(raw.avatarUrl || raw.avatar),
    viewerAffiliationStatus,
    viewerIsReferent: Boolean(raw.viewerIsReferent),
  }
}

export function mapAffiliation(raw) {
  if (!raw || typeof raw !== 'object') return null
  const status = LIST_AFFILIATION_STATUSES.has(raw.status) ? raw.status : 'pending'
  const roleRaw = String(raw.role || raw.memberRole || raw.user?.role || '').toLowerCase()
  const isReferent = Boolean(
    raw.isReferent ??
      raw.userIsReferent ??
      raw.viewerIsReferent ??
      raw.user?.isReferent ??
      roleRaw === 'referent',
  )
  return {
    user: mapUser(raw.user),
    status,
    isReferent,
    role: isReferent ? 'referent' : 'member',
    requestedAt: raw.requestedAt || '',
    decidedAt: raw.decidedAt || null,
  }
}

function authOpts() {
  const token = getToken()
  return token ? { auth: true } : { skipAuth: true }
}

/**
 * GET /institutions?parentId=&type=&search=&userId=&referentOnly=
 * Sans paramètre → continents. `type=local` sans parentId → tous les clubs.
 * `type=country&referentOnly=1` → pays où le viewer est référent (auth requis).
 */
export async function fetchInstitutions({
  parentId,
  type,
  search = '',
  userId,
  referentOnly = false,
} = {}) {
  const params = new URLSearchParams()
  if (parentId != null && parentId !== '') params.set('parentId', String(parentId))
  if (type) params.set('type', String(type))
  if (search) params.set('search', String(search))
  if (userId != null && userId !== '') params.set('userId', String(userId))
  if (referentOnly) params.set('referentOnly', '1')

  const qs = params.toString()
  const path = qs ? `${ENDPOINTS.institutions.list}?${qs}` : ENDPOINTS.institutions.list
  const opts = referentOnly ? { auth: true } : authOpts()
  const data = await appApiFetch(path, opts)
  const list = Array.isArray(data) ? data : []
  return list.map(mapInstitution).filter(Boolean)
}

/** GET /institutions/{id} */
export async function fetchInstitution(id) {
  const data = await appApiFetch(ENDPOINTS.institutions.detail(String(id)), authOpts())
  return mapInstitution(data)
}

/** POST /institutions — body: { name, type, parentId?, description? } */
export async function createInstitution({ name, type, parentId, description } = {}) {
  const body = { name, type, description: description || '' }
  if (parentId != null && parentId !== '') body.parentId = String(parentId)
  const data = await appApiFetch(ENDPOINTS.institutions.list, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  })
  return mapInstitution(data)
}

/** PATCH /institutions/{id} */
export async function updateInstitution(id, { name, description } = {}) {
  const body = {}
  if (name != null) body.name = name
  if (description != null) body.description = description
  const data = await appApiFetch(ENDPOINTS.institutions.detail(String(id)), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(body),
  })
  return mapInstitution(data)
}

/** DELETE /institutions/{id} — 409 has_children si enfants */
export async function deleteInstitution(id) {
  return appApiFetch(ENDPOINTS.institutions.detail(String(id)), {
    method: 'DELETE',
    auth: true,
  })
}

/**
 * POST /institutions/{id}/affiliation
 * @returns {{ status: string }}
 */
export async function requestAffiliation(id) {
  const data = await appApiFetch(ENDPOINTS.institutions.affiliation(String(id)), {
    method: 'POST',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'pending' }
}

/**
 * DELETE /institutions/{id}/affiliation
 * @returns {{ status: string }}
 */
export async function cancelAffiliation(id) {
  const data = await appApiFetch(ENDPOINTS.institutions.affiliation(String(id)), {
    method: 'DELETE',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'none' }
}

/** GET /institutions/{id}/affiliations?status= */
export async function fetchAffiliations(id, { status = 'active' } = {}) {
  const params = new URLSearchParams()
  if (status) params.set('status', String(status))
  const qs = params.toString()
  const base = ENDPOINTS.institutions.affiliations(String(id))
  const path = qs ? `${base}?${qs}` : base
  const data = await appApiFetch(path, authOpts())
  const list = Array.isArray(data) ? data : []
  return list.map(mapAffiliation).filter(Boolean)
}

/** POST /institutions/{id}/affiliations/{userId}/approve */
export async function approveAffiliation(id, userId) {
  const data = await appApiFetch(
    ENDPOINTS.institutions.approveAffiliation(String(id), String(userId)),
    { method: 'POST', auth: true },
  )
  return data && typeof data === 'object' ? data : { status: 'active' }
}

/** POST /institutions/{id}/affiliations/{userId}/reject */
export async function rejectAffiliation(id, userId) {
  const data = await appApiFetch(
    ENDPOINTS.institutions.rejectAffiliation(String(id), String(userId)),
    { method: 'POST', auth: true },
  )
  return data && typeof data === 'object' ? data : { status: 'rejected' }
}

/** POST /institutions/{id}/referents — body: { userId } */
export async function addReferent(id, userId) {
  const data = await appApiFetch(ENDPOINTS.institutions.addReferent(String(id)), {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ userId: String(userId) }),
  })
  return data && typeof data === 'object' ? data : { message: 'ok' }
}

/** DELETE /institutions/{id}/referents/{userId} */
export async function removeReferent(id, userId) {
  const data = await appApiFetch(
    ENDPOINTS.institutions.removeReferent(String(id), String(userId)),
    { method: 'DELETE', auth: true },
  )
  return data && typeof data === 'object' ? data : { message: 'ok' }
}
