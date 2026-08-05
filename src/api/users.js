import { ENDPOINTS } from '../config/api'
import { appApiFetch, getToken } from './client'

/**
 * Users / Profile — App API `/app/v1/users/*`
 * (récréé : le fichier avait disparu alors que les imports étaient encore actifs)
 */

function normalizeMediaUrl(url) {
  if (!url) return null
  let u = String(url).replace(/#038;/g, '&').replace(/&amp;/g, '&')
  if (u.startsWith('//')) u = `https:${u}`
  return u
}

/**
 * Mappe le profil App API vers la forme `member` consommée par l’UI.
 * @param {object} raw
 * @param {{ isSelf?: boolean, friendshipStatus?: string }} [opts]
 */
export function mapAppProfile(raw, opts = {}) {
  if (!raw || typeof raw !== 'object') return null

  const idNum = Number(raw.id)
  const id = Number.isFinite(idNum) ? idNum : raw.id
  if (id == null || id === '') return null

  const bio = raw.bio || ''
  const profession = raw.profession || ''
  const organization = raw.organization || ''
  const location = raw.location || ''
  const socialLinks =
    raw.socialLinks && typeof raw.socialLinks === 'object' && !Array.isArray(raw.socialLinks)
      ? raw.socialLinks
      : {}

  const socialFields = Object.entries(socialLinks).map(([key, value], index) => ({
    id: `social-${key}`,
    name: key,
    value: value == null ? '' : String(value),
    order: index,
  }))

  const followers = raw.stats?.followersCount ?? 0
  const following = raw.stats?.followingCount ?? 0
  const posts = raw.stats?.postsCount ?? 0

  return {
    id,
    userLogin: String(id),
    displayName: raw.displayName || 'Member',
    mentionName: raw.mentionName || String(id),
    email: raw.email || '',
    avatar: normalizeMediaUrl(raw.avatarUrl || raw.avatar),
    cover: normalizeMediaUrl(raw.coverUrl || raw.cover),
    bio,
    profession,
    organization,
    location,
    country: raw.country || '',
    region: raw.region || '',
    language: raw.language || '',
    thematic: raw.thematic || '',
    joined: raw.joinedAt || raw.joined || null,
    lastActive: raw.joinedAt || raw.lastActive || null,
    online: Boolean(raw.online),
    friendshipStatus: opts.friendshipStatus || (opts.isSelf ? 'self' : 'not_friends'),
    stats: {
      friends: followers,
      groups: raw.stats?.groups ?? 0,
      activity: posts,
      stories: posts,
      followers,
      following,
    },
    memberType: 'YEE',
    role: raw.role || 'yee',
    socialLinks,
    xprofile: [
      {
        id: 'app-profile',
        name: 'Profile',
        fields: [
          { id: 'bio', name: 'Bio', value: bio },
          { id: 'profession', name: 'Profession', value: profession },
          { id: 'organization', name: 'Organization', value: organization },
          { id: 'location', name: 'Location', value: location },
          ...socialFields,
        ],
      },
    ],
    friends: [],
    groups: [],
    link: `/members/${id}`,
  }
}

function authOpts() {
  const token = getToken()
  return token ? { auth: true } : { skipAuth: true }
}

export async function fetchMyProfile() {
  const data = await appApiFetch(ENDPOINTS.users.me, { auth: true })
  return mapAppProfile(data, { isSelf: true, friendshipStatus: 'self' })
}

export async function fetchPublicProfile(userId) {
  const data = await appApiFetch(ENDPOINTS.users.profile(String(userId)), authOpts())
  return mapAppProfile(data, { isSelf: false })
}

/** Enrichit le user auth (login / refresh) avec avatar, cover, email. */
export async function enrichSessionUser(user) {
  if (!user) return null
  try {
    const profile = await fetchMyProfile()
    return {
      ...user,
      displayName: profile.displayName || user.displayName,
      email: profile.email || user.email,
      avatar: profile.avatar || user.avatar,
      cover: profile.cover || user.cover,
      mentionName: profile.mentionName || user.mentionName,
      link: profile.link || user.link,
    }
  } catch {
    return user
  }
}

const PROFILE_FIELD_KEYS = new Set(['bio', 'profession', 'organization', 'location'])

/** Persiste un champ xprofile virtuel vers PATCH /users/me. */
export async function updateProfileField(fieldId, value) {
  const key = String(fieldId)
  if (PROFILE_FIELD_KEYS.has(key)) {
    return updateMyProfile({ [key]: value })
  }
  if (key.startsWith('social-')) {
    const socialKey = key.replace(/^social-/, '')
    const me = await appApiFetch(ENDPOINTS.users.me, { auth: true })
    const links = { ...(me?.socialLinks || {}), [socialKey]: value }
    return updateMyProfile({ socialLinks: links })
  }
  return updateMyProfile({ [key]: value })
}

export async function updateMyProfile(payload) {
  const data = await appApiFetch(ENDPOINTS.users.me, {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  })
  return mapAppProfile(data, { isSelf: true, friendshipStatus: 'self' })
}

export async function changePassword(currentPassword, newPassword) {
  return appApiFetch(ENDPOINTS.users.mePassword, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function deleteMyAccount(password) {
  return appApiFetch(ENDPOINTS.users.me, {
    method: 'DELETE',
    auth: true,
    body: JSON.stringify({ password }),
  })
}

export async function uploadAvatar(file) {
  const form = new FormData()
  form.append('avatar', file)
  return appApiFetch(ENDPOINTS.users.meAvatar, {
    method: 'POST',
    auth: true,
    body: form,
  })
}

export async function uploadCover(file) {
  const form = new FormData()
  form.append('cover', file)
  return appApiFetch(ENDPOINTS.users.meCover, {
    method: 'POST',
    auth: true,
    body: form,
  })
}

export async function followUser(userId) {
  return appApiFetch(ENDPOINTS.users.follow(String(userId)), {
    method: 'POST',
    auth: true,
  })
}

export async function unfollowUser(userId) {
  return appApiFetch(ENDPOINTS.users.follow(String(userId)), {
    method: 'DELETE',
    auth: true,
  })
}

function mapListPayload(data) {
  const list = Array.isArray(data) ? data : data?.items || data?.data || []
  return list.map((item) => mapAppProfile(item)).filter(Boolean)
}

export async function fetchFollowers(userId, { page = 1 } = {}) {
  const data = await appApiFetch(`${ENDPOINTS.users.followers(String(userId))}?page=${page}`, authOpts())
  return mapListPayload(data)
}

export async function fetchFollowing(userId, { page = 1 } = {}) {
  const data = await appApiFetch(`${ENDPOINTS.users.following(String(userId))}?page=${page}`, authOpts())
  return mapListPayload(data)
}
