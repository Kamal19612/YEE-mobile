/**
 * Harmonise avatar/cover avec la session Auth (upload App API).
 * Utile tant que certaines listes (BuddyPress) ne renvoient pas encore
 * les médias App API, ou avant redéploiement du plugin corrigé.
 */

export function sameUserId(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

/** Applique avatar/cover de la session sur un membre / activité si c’est le user connecté. */
export function withSessionMedia(entity, sessionUser, { idKey = 'id' } = {}) {
  if (!entity || !sessionUser?.id) return entity
  const entityId = entity[idKey] ?? entity.userId ?? entity.id
  if (!sameUserId(entityId, sessionUser.id)) return entity

  return {
    ...entity,
    ...(sessionUser.avatar ? { avatar: sessionUser.avatar } : {}),
    ...(sessionUser.cover ? { cover: sessionUser.cover } : {}),
  }
}

export function mapWithSessionMedia(list, sessionUser, opts) {
  if (!Array.isArray(list)) return list
  return list.map((item) => withSessionMedia(item, sessionUser, opts))
}
