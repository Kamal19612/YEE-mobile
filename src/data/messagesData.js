/** Aperçu pour le dropdown header */
export function threadPreview(thread) {
  const last = thread.messages?.[thread.messages.length - 1]
  const other = thread.participants?.[0]
  return {
    id: thread.id,
    name: thread.isGroup ? thread.subject : other?.displayName || thread.subject,
    excerpt: last?.content || '',
    time: last?.date || thread.updatedAt,
    unread: Boolean(thread.unread),
  }
}
