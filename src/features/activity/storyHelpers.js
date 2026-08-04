/** Helpers partagés pour commentaires imbriqués (profil / groupe / fil) */

export function nestComment(list, parentId, comment) {
  return list.map((c) =>
    c.id === parentId
      ? { ...c, children: [...(c.children || []), comment] }
      : { ...c, children: nestComment(c.children || [], parentId, comment) },
  )
}

export function applyComment(activity, { content, parentId = 0 }, author) {
  const comment = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    userId: author.id,
    userName: author.displayName,
    avatar: author.avatar,
    content,
    date: new Date().toISOString(),
    children: [],
  }
  if (!parentId) {
    return {
      ...activity,
      commentCount: (activity.commentCount || 0) + 1,
      comments: [...(activity.comments || []), comment],
    }
  }
  return {
    ...activity,
    commentCount: (activity.commentCount || 0) + 1,
    comments: nestComment(activity.comments || [], parentId, comment),
  }
}

export function buildStoryPost({ user, payload, group = null }) {
  return {
    id: Date.now(),
    userId: user.id,
    userName: user.displayName,
    userLink: `/members/${user.id}`,
    avatar: user.avatar,
    anonymous: Boolean(payload.anonymous),
    title: payload.title || '',
    content: payload.content || '',
    date: new Date().toISOString(),
    component: group ? 'groups' : 'activity',
    type: 'story',
    privacy: payload.privacy || 'public',
    status: payload.status || 'published',
    consent: Boolean(payload.consent),
    tags: payload.tags || null,
    favorited: false,
    favoriteCount: 0,
    commentCount: 0,
    edited: false,
    group,
    media: payload.media || [],
    poll: payload.poll || null,
    comments: [],
  }
}
