/**
 * Configuration API WordPress headless (App API + namespaces WP/BuddyPress).
 * Ne jamais hardcoder l’URL backend dans les composants — utiliser ces exports.
 */

const rawWp = (import.meta.env.VITE_WP_API_URL || '').replace(/\/$/, '')
const rawApp = (import.meta.env.VITE_APP_API_URL || '').replace(/\/$/, '')

/** Préfixe REST WordPress (/wp-json en local via proxy Vite). */
export const API_BASE = rawWp || '/wp-json'

/**
 * Namespace App API (Sprint 1–2).
 * Ex. /wp-json/app/v1  ou  https://site…/wp-json/app/v1
 */
export const APP_API_BASE = rawApp || `${API_BASE}/app/v1`

export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT) || 15_000

/**
 * Mock par défaut tant que VITE_USE_MOCK n’est pas explicitement "false".
 * En prod / contre WP réel : VITE_USE_MOCK=false dans .env
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** Chemins relatifs à APP_API_BASE — jamais d’URL en dur dans les services. */
export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
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
    profile: (id) => `/users/${id}`,
    follow: (id) => `/users/${id}/follow`,
    followers: (id) => `/users/${id}/followers`,
    following: (id) => `/users/${id}/following`,
  },
}
