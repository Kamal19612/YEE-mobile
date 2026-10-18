import i18n from '../i18n'
import {
  formatNotificationMessage,
  notificationHref,
} from '../features/notifications/utils'
import { mapNotification } from '../api/notifications'
import {
  isViewingConversation,
  pushLiveToast,
} from './liveToasts'

const OS_NOTIFY_MS = 4_500

function canUseOsNotification() {
  return (
    typeof window !== 'undefined' &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted' &&
    typeof document !== 'undefined' &&
    document.visibilityState === 'hidden'
  )
}

function showOsNotification({ title, body, href }) {
  if (!canUseOsNotification()) return
  try {
    const n = new Notification(title, {
      body: body || '',
      tag: href || undefined,
    })
    n.onclick = () => {
      try {
        window.focus()
        if (href) {
          const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '')
          const path = href.startsWith('/') ? href : `/${href}`
          window.location.assign(`${base}${path}`)
        }
      } catch {
        /* ignore */
      }
      n.close()
    }
    window.setTimeout(() => {
      try {
        n.close()
      } catch {
        /* ignore */
      }
    }, OS_NOTIFY_MS)
  } catch {
    /* ignore — permission / browser quirks */
  }
}

let permissionAsked = false

/** Demande douce (peut échouer hors geste utilisateur). */
export function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported')
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission)
  if (permissionAsked) return Promise.resolve('default')
  permissionAsked = true
  try {
    return Notification.requestPermission()
  } catch {
    return Promise.resolve('denied')
  }
}

/**
 * Toast (et OS si onglet caché) pour une notification inbox SSE.
 * @param {object} payload — event notification.created
 */
export function presentNotificationToast(payload) {
  const raw = payload?.notification
  if (!raw || typeof raw !== 'object') {
    pushLiveToast({
      kind: 'notification',
      title: i18n.t('notifications.generic'),
      href: '/notifications',
      dedupeKey: `notif-generic-${payload?.unreadCount ?? ''}-${Date.now()}`,
    })
    return
  }

  const mapped = mapNotification({
    ...raw,
    isRead: false,
    createdAt: raw.createdAt || new Date().toISOString(),
  })
  if (!mapped) return

  const title = formatNotificationMessage(i18n.t.bind(i18n), mapped)
  const href = notificationHref(mapped)
  const dedupeKey = mapped.id ? `notif-${mapped.id}` : `notif-${mapped.type}-${mapped.actor?.id || ''}`

  pushLiveToast({
    kind: 'notification',
    title,
    href,
    avatarUrl: mapped.actor?.avatarUrl || null,
    dedupeKey,
  })
  showOsNotification({ title, href })
}

/**
 * Toast message — ignoré si la conversation est déjà ouverte.
 * @param {object} payload — event message.created
 */
export function presentMessageToast(payload) {
  if (!payload || payload.type !== 'message.created') return
  const conversationId = payload.conversationId
  if (conversationId != null && isViewingConversation(conversationId)) return

  const senderName =
    (payload.senderName && String(payload.senderName).trim()) ||
    i18n.t('notifications.someone')
  const preview = payload.preview ? String(payload.preview).trim() : ''
  const body =
    preview ||
    (payload.hasMedia ? i18n.t('liveToast.mediaAttachment') : i18n.t('liveToast.newMessageBody'))
  const href = conversationId ? `/messages/${conversationId}` : '/messages'
  const dedupeKey = payload.messageId
    ? `msg-${payload.messageId}`
    : `msg-${conversationId}-${preview.slice(0, 40)}`

  pushLiveToast({
    kind: 'message',
    title: senderName,
    body,
    href,
    avatarUrl: payload.senderAvatarUrl || null,
    dedupeKey,
  })
  showOsNotification({
    title: i18n.t('liveToast.messageOsTitle', { name: senderName }),
    body,
    href,
  })
}
