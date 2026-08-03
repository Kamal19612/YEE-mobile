import { apiFetch } from './client'

/**
 * bbPress via WP REST (selon config) :
 * /wp/v2/forums, /wp/v2/topics, /wp/v2/replies
 */

const FORUMS = '/wp/v2/forums'
const TOPICS = '/wp/v2/topics'
const REPLIES = '/wp/v2/replies'

export function mapForum(item) {
  return {
    id: item.id,
    title: item.title?.rendered || item.title || 'Forum',
    slug: item.slug,
    description: item.content?.rendered || item.description || '',
    cover: item.featured_media_url || item.cover || null,
    topicCount: item.topic_count ?? 0,
    replyCount: item.reply_count ?? 0,
    lastActive: item.modified || item.date || null,
  }
}

export function mapTopic(item) {
  return {
    id: item.id,
    forumId: item.parent || item.forum_id,
    title: item.title?.rendered || item.title || 'Topic',
    content: item.content?.rendered || item.content || '',
    authorId: item.author,
    authorName: item.author_name || 'Member',
    date: item.date,
    replyCount: item.reply_count ?? 0,
    voiceCount: item.voice_count ?? 0,
    sticky: Boolean(item.sticky),
    closed: Boolean(item.closed),
    lastReplyAt: item.last_reply_date || item.modified,
    lastReplyAuthor: item.last_reply_author || '',
  }
}

export function mapReply(item) {
  return {
    id: item.id,
    topicId: item.parent || item.topic_id,
    authorId: item.author,
    authorName: item.author_name || 'Member',
    content: item.content?.rendered || item.content || '',
    date: item.date,
    parentId: item.reply_to || 0,
  }
}

export async function fetchForums({ token } = {}) {
  const data = await apiFetch(FORUMS, { token })
  return (Array.isArray(data) ? data : []).map(mapForum)
}

export async function fetchTopics(forumId, { token } = {}) {
  const data = await apiFetch(`${TOPICS}?parent=${forumId}`, { token })
  return (Array.isArray(data) ? data : []).map(mapTopic)
}

export async function fetchTopic(id, { token } = {}) {
  const data = await apiFetch(`${TOPICS}/${id}`, { token })
  return mapTopic(data)
}

export async function fetchReplies(topicId, { token } = {}) {
  const data = await apiFetch(`${REPLIES}?parent=${topicId}`, { token })
  return (Array.isArray(data) ? data : []).map(mapReply)
}

export async function createTopic({ forumId, title, content, token }) {
  const data = await apiFetch(TOPICS, {
    method: 'POST',
    token,
    body: JSON.stringify({ title, content, parent: forumId, status: 'publish' }),
  })
  return mapTopic(data)
}

export async function createReply({ topicId, content, parentId = 0, token }) {
  const data = await apiFetch(REPLIES, {
    method: 'POST',
    token,
    body: JSON.stringify({ content, parent: topicId, reply_to: parentId, status: 'publish' }),
  })
  return mapReply(data)
}
