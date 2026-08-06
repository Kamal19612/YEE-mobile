/** Clés i18n par type de notification (texte construit côté front). */
export const NOTIFICATION_I18N_KEYS = {
  new_follower: 'notifications.types.newFollower',
  group_invitation: 'notifications.types.groupInvitation',
  group_join_request: 'notifications.types.groupJoinRequest',
  group_request_approved: 'notifications.types.groupApproved',
  group_request_rejected: 'notifications.types.groupRejected',
  institution_affiliation_request: 'notifications.types.instRequest',
  institution_affiliation_approved: 'notifications.types.instApproved',
  institution_affiliation_rejected: 'notifications.types.instRejected',
  post_like: 'notifications.types.postLike',
  post_comment: 'notifications.types.postComment',
}

/**
 * Libellé d’une notification via i18n.
 * `subject.name` peut être null → repli « un groupe » / « une institution ».
 */
export function formatNotificationMessage(t, notification) {
  if (!notification) return t('notifications.generic')

  const actor = notification.actor?.displayName?.trim() || t('notifications.someone')
  const subjectType = notification.subject?.type
  const subjectName = notification.subject?.name?.trim()
  const subject =
    subjectName ||
    (subjectType === 'institution'
      ? t('notifications.anInstitution')
      : subjectType === 'group'
        ? t('notifications.aGroup')
        : t('notifications.something'))

  const key = NOTIFICATION_I18N_KEYS[notification.type] || 'notifications.generic'
  return t(key, { actor, subject })
}

/** Cible de navigation au clic. */
export function notificationHref(notification) {
  if (!notification) return '/notifications'

  switch (notification.type) {
    case 'new_follower':
      return notification.actor?.id
        ? `/members/${notification.actor.id}`
        : '/members'
    case 'group_invitation':
    case 'group_join_request':
    case 'group_request_approved':
    case 'group_request_rejected':
      return notification.subject?.id
        ? `/groups/${notification.subject.id}`
        : '/groups'
    case 'institution_affiliation_request':
    case 'institution_affiliation_approved':
    case 'institution_affiliation_rejected':
      return notification.subject?.id
        ? `/institutions/${notification.subject.id}`
        : '/institutions'
    case 'post_like':
    case 'post_comment':
      return notification.subject?.id
        ? `/feed/${notification.subject.id}`
        : '/'
    default:
      return '/notifications'
  }
}
