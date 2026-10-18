/** Miniature publique pour une couverture vidéo (YouTube / Drive). */
export function getEventVideoThumbnailUrl(event) {
  if (!event || event.coverType !== 'video') return null
  const id = String(event.videoExternalId || '').trim()
  if (!id) return null
  if (event.videoProvider === 'youtube') {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
  }
  if (event.videoProvider === 'drive') {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1280`
  }
  return null
}

/** Formate une date ISO événement pour l’UI. */
export function formatEventDate(iso, locale = 'fr') {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(locale || 'fr', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

/** Affiche une plage début → fin. */
export function formatEventRange(startsAt, endsAt, locale = 'fr') {
  if (!startsAt) return ''
  if (!endsAt || endsAt === startsAt) return formatEventDate(startsAt, locale)
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${formatEventDate(startsAt, locale)} – ${formatEventDate(endsAt, locale)}`
  }
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  try {
    if (sameDay) {
      const day = new Intl.DateTimeFormat(locale || 'fr', { dateStyle: 'full' }).format(start)
      const tStart = new Intl.DateTimeFormat(locale || 'fr', { timeStyle: 'short' }).format(start)
      const tEnd = new Intl.DateTimeFormat(locale || 'fr', { timeStyle: 'short' }).format(end)
      return `${day}, ${tStart} – ${tEnd}`
    }
    return `${formatEventDate(startsAt, locale)} → ${formatEventDate(endsAt, locale)}`
  } catch {
    return `${start.toLocaleString()} → ${end.toLocaleString()}`
  }
}

/** Convertit datetime-local → ISO UTC pour l’API. */
export function localInputToIso(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

/** Convertit ISO → valeur datetime-local. */
export function isoToLocalInput(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
