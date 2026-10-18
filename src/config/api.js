/**
 * Configuration API — backend Spring Boot (contrat JSON inchangé).
 * Ne jamais hardcoder l’URL backend dans les composants — utiliser ces exports.
 *
 * Dev local : VITE_API_URL vide → same-origin `/api` via proxy Vite
 *             (cookie refresh Path=/api/auth)
 * Prod : VITE_API_URL=https://<host-api>/api (URL absolue, sans slash final)
 *        ou vide si le reverse proxy expose `/api` en same-origin.
 */

const rawFromVite = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const rawLegacyApp = (import.meta.env.VITE_APP_API_URL || '').replace(/\/$/, '')

/** Ignore les anciennes bases WordPress si VITE_API_URL n’est pas encore défini. */
function resolveApiBase() {
  if (rawFromVite) return rawFromVite
  if (
    rawLegacyApp &&
    !rawLegacyApp.includes('wp-json') &&
    !/\/app\/v1\/?$/.test(rawLegacyApp)
  ) {
    return rawLegacyApp
  }
  // Same-origin : préfixe API (évite collision SPA /feed|/notifications|…)
  return '/api'
}

const rawApi = resolveApiBase()

/**
 * Base unique de l’API Spring.
 * Dev (proxy) : `/api`
 * Prod : `https://api…/api` ou `/api`
 *
 * `API_BASE` ≡ `APP_API_BASE` : la scission wp-json / app/v1 n’a plus de sens.
 */
export const API_BASE = rawApi
export const APP_API_BASE = API_BASE

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT) || 15_000

/** Chemins relatifs à APP_API_BASE — jamais d’URL en dur dans les services. */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    resendVerification: '/auth/resend-verification',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
  },
  users: {
    me: '/users/me',
    mePassword: '/users/me/password',
    meAvatar: '/users/me/avatar',
    meCover: '/users/me/cover',
    meGroupInvites: '/users/me/group-invites',
    list: '/users',
    summary: '/users/summary',
    search: '/users/search',
    profile: (id) => `/users/${id}`,
    follow: (id) => `/users/${id}/follow`,
    followers: (id) => `/users/${id}/followers`,
    following: (id) => `/users/${id}/following`,
  },
  feed: {
    list: '/feed',
    detail: (id) => `/feed/${id}`,
    like: (id) => `/feed/${id}/like`,
    likes: (id) => `/feed/${id}/likes`,
    likers: (id) => `/feed/${id}/likers`,
    comments: (id) => `/feed/${id}/comments`,
    deleteComment: (commentId) => `/feed/comments/${commentId}`,
    linkPreview: '/feed/link-preview',
  },
  groups: {
    list: '/groups',
    detail: (id) => `/groups/${id}`,
    join: (id) => `/groups/${id}/join`,
    membership: (id) => `/groups/${id}/membership`,
    members: (id) => `/groups/${id}/members`,
    invitations: (id) => `/groups/${id}/invitations`,
    respondInvitation: (id) => `/groups/${id}/invitations/respond`,
    approveMember: (id, userId) => `/groups/${id}/members/${userId}/approve`,
    rejectMember: (id, userId) => `/groups/${id}/members/${userId}/reject`,
    removeMember: (id, userId) => `/groups/${id}/members/${userId}`,
    changeMemberRole: (id, userId) => `/groups/${id}/members/${userId}/role`,
  },
  institutions: {
    list: '/institutions',
    detail: (id) => `/institutions/${id}`,
    affiliation: (id) => `/institutions/${id}/affiliation`,
    affiliations: (id) => `/institutions/${id}/affiliations`,
    removeMember: (id, userId) => `/institutions/${id}/affiliations/${userId}`,
    approveAffiliation: (id, userId) => `/institutions/${id}/affiliations/${userId}/approve`,
    rejectAffiliation: (id, userId) => `/institutions/${id}/affiliations/${userId}/reject`,
    addReferent: (id) => `/institutions/${id}/referents`,
    removeReferent: (id, userId) => `/institutions/${id}/referents/${userId}`,
  },
  events: {
    list: '/events',
    detail: (id) => `/events/${id}`,
    categories: '/events/categories',
    category: (id) => `/events/categories/${id}`,
    cover: (id) => `/events/${id}/cover`,
    report: (id) => `/events/${id}/report`,
    visuals: (id) => `/events/${id}/visuals`,
    visual: (id, visualId) => `/events/${id}/visuals/${visualId}`,
  },
  resources: {
    list: '/resources',
    detail: (id) => `/resources/${id}`,
    file: (id) => `/resources/${id}/file`,
    cover: (id) => `/resources/${id}/cover`,
    categories: '/resources/categories',
    category: (id) => `/resources/categories/${id}`,
  },
  conversations: {
    list: '/conversations',
    unreadCount: '/conversations/unread-count',
    search: '/conversations/search',
    detail: (id) => `/conversations/${id}`,
    messages: (id) => `/conversations/${id}/messages`,
    message: (id, messageId) => `/conversations/${id}/messages/${messageId}`,
    read: (id) => `/conversations/${id}/read`,
    typing: (id) => `/conversations/${id}/typing`,
    group: (id) => `/conversations/group/${id}`,
    delete: (id) => `/conversations/${id}`,
  },
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    stream: '/notifications/stream',
    read: (id) => `/notifications/${id}/read`,
    readAll: '/notifications/read-all',
    pushVapidKey: '/notifications/push/vapid-public-key',
    pushSubscribe: '/notifications/push/subscribe',
    pushUnsubscribe: '/notifications/push/subscribe',
  },
  admin: {
    accounts: '/admin/accounts',
    account: (id) => `/admin/accounts/${id}`,
    accountActivity: (id) => `/admin/accounts/${id}/activity`,
    revokeSessions: (id) => `/admin/accounts/${id}/sessions/revoke`,
    deleteAccount: (id) => `/admin/accounts/${id}`,
    accountConversations: (id) => `/admin/accounts/${id}/conversations`,
    deleteConversation: (id) => `/admin/conversations/${id}`,
  },
}
