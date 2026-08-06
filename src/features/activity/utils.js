import i18n from '../../i18n'

export function formatTimeSince(dateInput) {
  const date = new Date(dateInput)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (Number.isNaN(seconds) || seconds < 45) return i18n.t('timeSince.justNow')

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return i18n.t('timeSince.minutes', { count: minutes })
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return i18n.t('timeSince.hours', { count: hours })
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return i18n.t('timeSince.days', { count: days })
  }

  const months = Math.floor(days / 30)
  if (months < 12) {
    return i18n.t('timeSince.months', { count: months })
  }

  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'
  return date.toLocaleDateString(locale)
}

export function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, '')
}
