/**
 * Configuration API WordPress headless.
 * Ne jamais hardcoder l’URL backend dans les composants — utiliser ces exports.
 *
 * Préfixe hébergement type spiritdesign : /index.php/wp-json
 */

const rawBase = (import.meta.env.VITE_WP_API_URL || '').replace(/\/$/, '')

export const API_BASE = rawBase || '/wp-json'

export const JWT_AUTH_ENDPOINT =
  (import.meta.env.VITE_JWT_AUTH_ENDPOINT || '').replace(/\/$/, '') ||
  `${API_BASE}/simple-jwt-login/v1/auth`

/**
 * Mock par défaut tant que VITE_USE_MOCK n’est pas explicitement "false".
 * En prod / contre WP réel : VITE_USE_MOCK=false dans .env
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export const TOKEN_STORAGE_KEY = 'afrea_jwt'

/**
 * Limitation sécurité (documentée) :
 * sessionStorage est vulnérable au XSS. Un cookie httpOnly côté WP/proxy
 * serait préférable pour des données YEE sensibles — à migrer plus tard.
 */
export const TOKEN_STORAGE = 'sessionStorage'
