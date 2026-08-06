import { ENABLE_BUDDYPRESS } from '../config/api'
import { apiFetch } from './client'

/**
 * BuddyPress REST — members / xprofile / friends
 * Désactivé via ENABLE_BUDDYPRESS — profils via App API (`users.js`).
 */

const MEMBERS = '/buddypress/v1/members'
const FRIENDS = '/buddypress/v1/friends'
const XPROFILE = '/buddypress/v1/xprofile'

export function mapMember(item) {
  const avatar = item.avatar_urls || item.avatar || {}
  const meta = item.meta || {}
  return {
    id: item.id,
    userLogin: item.user_login || item.mention_name || '',
    displayName: item.name || item.display_name || 'Member',
    mentionName: item.mention_name || item.user_login || '',
    avatar: avatar.full || avatar.thumb || null,
    cover: item.cover_url || item.cover || null,
    bio: item.biography || item.description || '',
    country: item.country || meta.country || '',
    region: item.region || meta.region || '',
    language: item.language || meta.language || '',
    thematic: item.thematic || meta.thematic || '',
    location: item.location || '',
    joined: item.registered_date || item.date_registered || null,
    lastActive: item.last_activity?.date || item.last_activity || null,
    online: Boolean(item.is_online ?? item.online),
    friendshipStatus: item.friendship_status || 'not_friends',
    stats: {
      friends: item.total_friend_count ?? item.friends_count ?? 0,
      groups: item.total_group_count ?? item.groups_count ?? 0,
      activity: item.activity_count ?? 0,
      stories: item.stories_count ?? item.activity_count ?? 0,
    },
    memberType: item.member_types?.[0] || item.member_type || 'YEE',
    role: item.role || meta.role || 'yee',
    xprofile: item.xprofile?.groups || item.xprofile || [],
    friends: item.friends || [],
    groups: item.groups || [],
    link: item.link || `/members/${item.id}`,
  }
}

export async function fetchMembers({
  page = 1,
  perPage = 12,
  search = '',
  type = 'active',
  token,
} = {}) {
  if (!ENABLE_BUDDYPRESS) return []
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    type,
  })
  if (search) params.set('search', search)
  const data = await apiFetch(`${MEMBERS}?${params}`, {
    token,
    skipAuth: token == null,
  })
  const list = Array.isArray(data) ? data : data?.members || []
  return list.map(mapMember)
}

export async function fetchMember(id, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  const data = await apiFetch(`${MEMBERS}/${id}`, {
    token,
    skipAuth: token == null,
  })
  return mapMember(data)
}

export async function fetchXProfile(userId, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return []
  return apiFetch(`${XPROFILE}/groups?user_id=${userId}`, { token })
}

export async function updateFriendship(friendId, { action = 'create', token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  if (action === 'create') {
    return apiFetch(FRIENDS, {
      method: 'POST',
      token,
      body: JSON.stringify({ friend_id: friendId }),
    })
  }
  return apiFetch(`${FRIENDS}/${friendId}`, { method: 'DELETE', token })
}
