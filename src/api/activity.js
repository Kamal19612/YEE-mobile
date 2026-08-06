import { ENABLE_BUDDYPRESS } from '../config/api'
import { apiFetch } from './client'

/**
 * BuddyPress REST activity — désactivé (ENABLE_BUDDYPRESS=false).
 * Le fil live passe par App API `src/api/feed.js`.
 * @see https://developer.buddypress.org/bp-rest-api/
 */

const BASE = '/buddypress/v1/activity'

function stripHtml(html) {
  if (!html || typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export function mapActivity(item) {
  const user = item.user_avatar || item.user || {}
  const meta = item.meta || {}
  const rawContent = item.content?.rendered || item.content?.raw || item.content || ''
  const content = typeof rawContent === 'string' ? stripHtml(rawContent) : ''
  const statusRaw = item.status || meta.publication_status || 'published'
  const status =
    statusRaw === 'publish' || statusRaw === 'public' ? 'published' : statusRaw

  return {
    id: item.id,
    userId: item.user_id,
    userName: item.user_name || item.name || 'Member',
    userLink: item.user_link || (item.user_id ? `/members/${item.user_id}` : '#'),
    avatar: typeof user === 'string' ? user : user.full || user.thumb || null,
    anonymous: Boolean(item.anonymous ?? meta.anonymous),
    title: item.title || meta.title || '',
    content,
    date: item.date || item.date_gmt || new Date().toISOString(),
    component: item.component || 'activity',
    type: item.type || 'story',
    privacy: item.privacy || 'public',
    status,
    consent: Boolean(item.consent ?? meta.consent),
    tags: item.tags || meta.tags || {
      country: meta.country || '',
      thematic: meta.thematic || '',
      language: meta.language || '',
    },
    favorited: Boolean(item.favorited),
    favoriteCount: item.favorite_count ?? meta.favorite_count ?? 0,
    commentCount: item.comment_count ?? meta.comment_count ?? 0,
    comments: (item.comments || []).map(mapComment),
    group: item.group
      ? {
          id: item.group.id,
          name: item.group.name,
          avatar: item.group.avatar_urls?.thumb || null,
          link: item.group.link || '#',
        }
      : null,
    media: item.bp_media_ids || item.media || [],
    edited: Boolean(item.edited),
  }
}

function mapComment(c) {
  return {
    id: c.id,
    userId: c.user_id,
    userName: c.user_name || c.name || 'Member',
    avatar: c.user_avatar?.thumb || c.avatar || null,
    content: c.content?.rendered || c.content || '',
    date: c.date || c.date_gmt || new Date().toISOString(),
    children: (c.children || []).map(mapComment),
  }
}

export async function fetchActivities({
  page = 1,
  perPage = 10,
  scope = 'all',
  search = '',
  token,
} = {}) {
  if (!ENABLE_BUDDYPRESS) return []
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  })
  if (scope && scope !== 'all' && scope !== 'pending') params.set('scope', scope)
  if (search) params.set('search', search)

  const data = await apiFetch(`${BASE}?${params}`, {
    ...(token !== undefined ? { token } : { auth: true }),
  })
  const list = Array.isArray(data) ? data : data?.activities || []
  return list.map(mapActivity)
}

export async function createActivity({
  content,
  title = '',
  privacy = 'public',
  status = 'pending',
  consent = false,
  anonymous = false,
  tags = {},
  media = [],
  token,
} = {}) {
  if (!ENABLE_BUDDYPRESS) {
    return mapActivity({
      id: Date.now(),
      user_id: 0,
      user_name: 'Member',
      content: { rendered: content },
      title,
      privacy,
      status,
      consent,
      anonymous,
      tags,
      media,
      date: new Date().toISOString(),
    })
  }
  const data = await apiFetch(BASE, {
    method: 'POST',
    token,
    body: JSON.stringify({
      content,
      title,
      privacy,
      type: 'activity_update',
      status,
      consent,
      anonymous,
      tags,
      media,
      meta: {
        publication_status: status,
        consent,
        anonymous,
        title,
        ...tags,
      },
    }),
  })
  return mapActivity(data)
}

export async function deleteActivity(id, { token } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${id}`, { method: 'DELETE', token })
}

export async function favoriteActivity(id, { token, favorited } = {}) {
  if (!ENABLE_BUDDYPRESS) return null
  return apiFetch(`${BASE}/${id}/favorite`, {
    method: favorited ? 'DELETE' : 'POST',
    token,
  })
}

export async function postComment(activityId, { content, parentId = 0, token } = {}) {
  if (!ENABLE_BUDDYPRESS) {
    return {
      id: Date.now(),
      userId: 0,
      userName: 'Member',
      avatar: null,
      content,
      date: new Date().toISOString(),
      children: [],
    }
  }
  const data = await apiFetch(`${BASE}/${activityId}/comment`, {
    method: 'POST',
    token,
    body: JSON.stringify({ content, parent_id: parentId }),
  })
  return mapComment(data)
}
