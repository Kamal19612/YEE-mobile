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
    return {
      id: '',
      displayName: '',
      avatarUrl: null,
      coverUrl: null,
      profession: '',
      memberType: null,
    }
  }
  const memberTypes = raw.memberTypes || raw.member_types
  const memberType =
    raw.memberType ||
    raw.member_type ||
    (Array.isArray(memberTypes) && memberTypes.length ? memberTypes[0] : null) ||
    null

  return {
    id: String(raw.id ?? ''),
    displayName: raw.displayName || raw.name || '',
    avatarUrl: normalizeMediaUrl(raw.avatarUrl || raw.avatar),
    coverUrl: normalizeMediaUrl(raw.coverUrl || raw.cover),
    profession: raw.profession || '',
    memberType: memberType ? String(memberType) : null,
  }
}

/** Normalise une institution — `viewerAffiliationStatus` / `viewerIsReferent` viennent du serveur. */
export function mapInstitution(raw) {
  if (!raw || typeof raw !== 'object') return null

  const type = TYPES.has(raw.type) ? raw.type : 'local'
  const viewerAffiliationStatus = AFFILIATION_STATUSES.has(raw.viewerAffiliationStatus)
    ? raw.viewerAffiliationStatus
    : AFFILIATION_STATUSES.has(raw.affiliationStatus)
      ? raw.affiliationStatus
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
    viewerIsReferent: Boolean(raw.viewerIsReferent ?? raw.isReferent ?? raw.is_referent),
  }
}

function pickAffiliationRole(raw) {
  const candidates = [
    raw.role,
    raw.memberRole,
    raw.member_role,
    raw.affiliationRole,
    raw.affiliation_role,
    raw.userRole,
    raw.user_role,
    raw.user?.role,
    raw.user?.memberRole,
    raw.user?.member_role,
  ]
  for (const value of candidates) {
    if (value == null || value === '') continue
    if (Array.isArray(value)) {
      const hit = value.map((v) => String(v).toLowerCase()).find(Boolean)
      if (hit) return hit
      continue
    }
    return String(value).toLowerCase()
  }
  return ''
}

export function mapAffiliation(raw) {
  if (!raw || typeof raw !== 'object') return null
  const status = LIST_AFFILIATION_STATUSES.has(raw.status) ? raw.status : 'pending'
  const roleRaw = pickAffiliationRole(raw)
  const isReferentFlag =
    raw.isReferent ??
    raw.is_referent ??
    raw.userIsReferent ??
    raw.user_is_referent ??
    raw.viewerIsReferent ??
    raw.user?.isReferent ??
    raw.user?.is_referent
  const isReferent = Boolean(
    isReferentFlag ||
      roleRaw === 'referent' ||
      roleRaw === 'referent_user' ||
      roleRaw.includes('referent'),
  )
  return {
    user: mapUser(raw.user),
    status,
    isReferent,
    role: isReferent ? 'referent' : roleRaw && roleRaw !== 'member' ? roleRaw : 'member',
    requestedAt: raw.requestedAt || raw.requested_at || '',
    decidedAt: raw.decidedAt || raw.decided_at || null,
  }
}

/**
 * Si l’API n’envoie pas isReferent, marque le plus ancien affilié actif comme référent
 * (souvent le créateur / premier validé).
 */
export function withInferredReferents(affiliations) {
  const list = Array.isArray(affiliations) ? affiliations.map((a) => ({ ...a })) : []
  if (!list.length) return list
  if (list.some((a) => a.isReferent)) return list

  const stamp = (a) => {
    const iso = a.decidedAt || a.requestedAt
    const t = iso ? Date.parse(iso) : NaN
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER
  }

  let oldestIdx = 0
  for (let i = 1; i < list.length; i += 1) {
    if (stamp(list[i]) < stamp(list[oldestIdx])) oldestIdx = i
  }
  list[oldestIdx] = {
    ...list[oldestIdx],
    isReferent: true,
    role: 'referent',
  }
  return list
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
 * Sans userId : le viewer quitte l’institution.
 * Avec userId : un référent retire ce membre (query ?userId=).
 * @returns {{ status: string }}
 */
export async function cancelAffiliation(id, { userId } = {}) {
  const params = new URLSearchParams()
  if (userId != null && userId !== '') params.set('userId', String(userId))
  const qs = params.toString()
  const base = ENDPOINTS.institutions.affiliation(String(id))
  const path = qs ? `${base}?${qs}` : base
  const data = await appApiFetch(path, {
    method: 'DELETE',
    auth: true,
  })
  return data && typeof data === 'object' ? data : { status: 'none' }
}

/** Référent retire un membre — DELETE /affiliation?userId= */
export async function removeMember(id, userId) {
  return cancelAffiliation(id, { userId })
}

/**
 * La liste affiliations ne renvoie pas coverUrl — on complète via GET /users/{id}.
 */
export async function enrichAffiliationMedia(affiliations) {
  const { fetchPublicProfile } = await import('./users')
  return Promise.all(
    affiliations.map(async (affiliation) => {
      const userId = affiliation?.user?.id
      if (!userId) return affiliation
      try {
        const profile = await fetchPublicProfile(userId)
        if (!profile) return affiliation
        return {
          ...affiliation,
          user: {
            ...affiliation.user,
            coverUrl: profile.cover || affiliation.user.coverUrl || null,
            avatarUrl: affiliation.user.avatarUrl || profile.avatar || null,
            profession: affiliation.user.profession || profile.profession || '',
            memberType: affiliation.user.memberType || profile.memberType || null,
          },
        }
      } catch {
        return affiliation
      }
    }),
  )
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
