/** Toasts éphémères (messages + notifications) — durée courte, hors page dédiée. */

const TOAST_MS = 4_500
const MAX_VISIBLE = 3

const listeners = new Set()
/** @type {Array<{ id: string, kind: string, title: string, body: string, href: string, avatarUrl?: string|null, createdAt: number }>} */
let toasts = []
let seq = 0

function publish() {
  const snapshot = toasts.slice()
  listeners.forEach((fn) => {
    try {
      fn(snapshot)
    } catch {
      /* ignore */
    }
  })
}

/**
 * @param {{
 *   kind?: 'notification' | 'message',
 *   title: string,
 *   body?: string,
 *   href?: string,
 *   avatarUrl?: string|null,
 *   durationMs?: number,
 *   dedupeKey?: string,
 * }} input
 */
export function pushLiveToast(input) {
  if (!input?.title) return null
  const dedupeKey = input.dedupeKey ? String(input.dedupeKey) : null
  if (dedupeKey && toasts.some((t) => t.dedupeKey === dedupeKey)) return null

  const id = `toast-${Date.now()}-${++seq}`
  const durationMs = Math.max(1_500, Number(input.durationMs) || TOAST_MS)
  const toast = {
    id,
    kind: input.kind === 'message' ? 'message' : 'notification',
    title: String(input.title),
    body: input.body ? String(input.body) : '',
    href: input.href ? String(input.href) : '/',
    avatarUrl: input.avatarUrl || null,
    dedupeKey,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMs,
  }
  toasts = [toast, ...toasts].slice(0, MAX_VISIBLE)
  publish()
  window.setTimeout(() => dismissLiveToast(id), durationMs)
  return id
}

export function dismissLiveToast(id) {
  const next = toasts.filter((t) => t.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  publish()
}

export function clearLiveToasts() {
  if (!toasts.length) return
  toasts = []
  publish()
}

export function subscribeLiveToasts(fn) {
  listeners.add(fn)
  fn(toasts.slice())
  return () => listeners.delete(fn)
}

export const LIVE_TOAST_MS = TOAST_MS

/** Conversation ouverte dans l’URL ? (évite toast message redondant). */
export function isViewingConversation(conversationId) {
  if (conversationId == null || typeof window === 'undefined') return false
  const path = window.location.pathname || ''
  const match = path.match(/\/messages\/([^/]+)\/?$/)
  return Boolean(match && String(match[1]) === String(conversationId))
}
