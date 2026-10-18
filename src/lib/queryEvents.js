/**
 * Bus d’invalidation léger — après une mutation, les écrans abonnés
 * se resynchronisent en silence (sans spinner).
 *
 * Pas de React Query : même esprit que le poll notifications déjà en place.
 */

const listeners = new Map()

export const QueryKeys = Object.freeze({
  feed: 'feed',
  notifications: 'notifications',
  members: 'members',
  groups: 'groups',
  groupMembers: 'group-members',
  institutions: 'institutions',
  institutionMembers: 'institution-members',
  messages: 'messages',
  resources: 'resources',
  events: 'events',
})

/**
 * @param {string} key
 * @param {(detail?: unknown) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  const set = listeners.get(key)
  set.add(fn)
  return () => set.delete(fn)
}

/**
 * Notifie tous les abonnés d’une clé (ex. après like / follow / join).
 * @param {string} key
 * @param {unknown} [detail]
 */
export function invalidate(key, detail) {
  const set = listeners.get(key)
  if (!set?.size) return
  set.forEach((fn) => {
    try {
      fn(detail)
    } catch {
      /* ignore listener errors */
    }
  })
}

/** @param {string[]} keys */
export function invalidateMany(keys, detail) {
  keys.forEach((key) => invalidate(key, detail))
}

/** Raccourci : rafraîchir badge + listes de notifications en arrière-plan. */
export function nudgeNotifications(detail) {
  invalidate(QueryKeys.notifications, detail)
}
