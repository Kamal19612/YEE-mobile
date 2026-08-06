import { ENDPOINTS } from '../config/api'
import { appApiFetch, clearToken, getToken, refreshAccessToken, setToken } from './client'

/**
 * AuthService — App API `/app/v1/auth/*`
 * Contrat : { success, data } géré par appApiFetch.
 */

/**
 * @param {object|null} raw
 * @returns {object|null} forme UI existante (AuthProvider / Header / Profile)
 */
export function mapAppUser(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ?? raw.ID ?? raw.user_id
  if (id == null || id === '') return null
  const numericId = Number(id)
  const safeId = Number.isFinite(numericId) ? numericId : id
  const email = raw.email || raw.user_email || ''
  const displayName = raw.displayName || raw.display_name || raw.name || email || 'Member'
  return {
    id: safeId,
    displayName,
    mentionName: raw.mentionName || raw.slug || raw.user_login || String(safeId),
    email,
    avatar: raw.avatar || raw.avatarUrl || null,
    cover: raw.cover || raw.coverUrl || null,
    role: raw.role || (Array.isArray(raw.roles) && raw.roles[0]) || 'yee',
    roles: Array.isArray(raw.roles) ? raw.roles : [],
    link: `/members/${safeId}`,
    // Indicateur d’affichage uniquement — le backend reste la source d’autorisation
    isSiteAdmin: Boolean(raw.isSiteAdmin),
  }
}

/**
 * Indique qu’une session a déjà existé (cookie refresh httpOnly non lisible en JS).
 * Évite un POST /auth/refresh 401 bruyant pour les visiteurs jamais connectés.
 */
const SESSION_HINT_KEY = 'app_had_session'

function setSessionHint() {
  try {
    localStorage.setItem(SESSION_HINT_KEY, '1')
  } catch {
    /* private mode */
  }
}

function clearSessionHint() {
  try {
    localStorage.removeItem(SESSION_HINT_KEY)
  } catch {
    /* private mode */
  }
}

function hasSessionHint() {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * @returns {Promise<{ accessToken: string, expiresIn: number, user: object }>}
 */
export async function login(email, password, { rememberMe = true } = {}) {
  const data = await appApiFetch(ENDPOINTS.auth.login, {
    method: 'POST',
    skipAuth: true,
    suppressUnauthorized: true,
    body: JSON.stringify({ email, password, rememberMe }),
  })

  const accessToken = data?.accessToken
  if (!accessToken) {
    const err = new Error('Réponse login invalide — accessToken manquant')
    err.status = 401
    err.body = data
    throw err
  }

  setToken(accessToken)
  setSessionHint()
  return {
    accessToken,
    expiresIn: data.expiresIn ?? 900,
    user: mapAppUser(data.user),
    raw: data,
  }
}

/**
 * Déconnexion serveur (révoque refresh cookie) + clear mémoire.
 */
export async function logout() {
  try {
    if (getToken()) {
      await appApiFetch(ENDPOINTS.auth.logout, {
        method: 'POST',
        auth: true,
        suppressUnauthorized: true,
      })
    }
  } catch {
    /* session déjà invalide — on nettoie quand même */
  } finally {
    clearToken()
    clearSessionHint()
  }
}

/**
 * Restaure la session via cookie refresh (F5 / nouvel onglet).
 * Passe par refreshAccessToken() (mutex) pour éviter double rotation StrictMode.
 * @returns {Promise<{ accessToken: string, user: object }|null>}
 */
export async function restoreSession() {
  // Pas de hint = jamais connecté sur cet appareil → pas d’appel refresh (évite 401 console)
  if (!hasSessionHint()) {
    clearToken()
    return null
  }

  try {
    const data = await refreshAccessToken()
    if (!data?.accessToken) {
      clearToken()
      clearSessionHint()
      return null
    }
    setSessionHint()
    const user = mapAppUser(data.user)
    if (!user) {
      clearToken()
      clearSessionHint()
      return null
    }
    return { accessToken: data.accessToken, user }
  } catch {
    clearToken()
    clearSessionHint()
    return null
  }
}

/**
 * @param {{ suppressUnauthorized?: boolean }} [opts]
 */
export async function getCurrentUser(opts = {}) {
  const { suppressUnauthorized = false } = opts
  if (!getToken()) return null

  try {
    const data = await appApiFetch(ENDPOINTS.auth.me, {
      method: 'GET',
      auth: true,
      suppressUnauthorized,
    })
    return mapAppUser(data)
  } catch (err) {
    if (!suppressUnauthorized) clearToken()
    throw err
  }
}

export async function register({ email, password, displayName }) {
  return appApiFetch(ENDPOINTS.auth.register, {
    method: 'POST',
    skipAuth: true,
    suppressUnauthorized: true,
    body: JSON.stringify({ email, password, displayName }),
  })
}

export async function verifyEmail(token) {
  return appApiFetch(ENDPOINTS.auth.verifyEmail, {
    method: 'POST',
    skipAuth: true,
    suppressUnauthorized: true,
    body: JSON.stringify({ token }),
  })
}

export async function forgotPassword(email) {
  return appApiFetch(ENDPOINTS.auth.forgotPassword, {
    method: 'POST',
    skipAuth: true,
    suppressUnauthorized: true,
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token, newPassword) {
  return appApiFetch(ENDPOINTS.auth.resetPassword, {
    method: 'POST',
    skipAuth: true,
    suppressUnauthorized: true,
    body: JSON.stringify({ token, newPassword }),
  })
}

export { getToken, clearToken, setToken }
