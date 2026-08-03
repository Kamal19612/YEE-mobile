export function formatTimeSince(dateInput) {
  const date = new Date(dateInput)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (Number.isNaN(seconds) || seconds < 45) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '')
}
