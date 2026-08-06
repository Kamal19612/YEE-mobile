import { API_BASE, APP_API_BASE, API_TIMEOUT_MS, ENDPOINTS } from '../config/api'

/**
 * Client HTTP centralisé (fetch).
 *
 * - Access token App API : mémoire uniquement (XSS) — jamais localStorage
 * - Refresh : cookie httpOnly `app_refresh_token` (credentials: include)
 * - File d’attente sur 401 : une seule requête /auth/refresh à la fois
 * - Contrat App API : { success, data } | { success: false, error }
 * - Autres namespaces (BuddyPress, wp/v2) : corps JSON natif WP
 */

let memoryAccessToken = null
let onUnauthorized = null

/** Refresh en cours + file d’attente (évite de griller le refresh rotatif). */
let refreshPromise = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : null
}

export function getToken() {
  return memoryAccessToken
}

export function setToken(token) {
  memoryAccessToken = token || null
}

export function clearToken() {
  memoryAccessToken = null
}

function resolveUrl(path, { appApi = false } = {}) {
  if (!path) return appApi ? APP_API_BASE : API_BASE
  if (path.startsWith('http')) return path

  if (appApi) {
    if (path === APP_API_BASE || path.startsWith(`${APP_API_BASE}/`)) return path
    return `${APP_API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  }

  if (path === API_BASE || path.startsWith(`${API_BASE}/`)) return path
  if (path.startsWith('/app/v1') || path.startsWith('app/v1')) {
    const rest = path.replace(/^\/?app\/v1/, '')
    return `${APP_API_BASE}${rest.startsWith('/') ? rest : `/${rest}`}`
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

function isAppApiUrl(url) {
  return url.includes('/app/v1') || url.startsWith(APP_API_BASE)
}

function parseErrorMessage(status, body, statusText) {
  if (body && typeof body === 'object') {
    if (body.success === false && body.error) {
      return body.error.message || body.error.code || `API ${status}`
    }
    return (
      body.message ||
      body.error ||
      body.data?.message ||
      (Array.isArray(body) && body[0]?.message) ||
      `API ${status}: ${statusText || 'Error'}`
    )
  }
  return `API ${status}: ${statusText || 'Error'}`
}

function extractErrorCode(body) {
  if (!body || typeof body !== 'object') return undefined
  if (body.success === false && body.error?.code) return body.error.code
  return body.code
}

/** Codes App API / JWT qui justifient refresh ou déconnexion. */
function isAuthFailure(status, code, message = '') {
  if (status !== 401) return false
  if (
    code === 'app_auth_token_expired' ||
    code === 'app_auth_invalid_signature' ||
    code === 'app_auth_malformed_token' ||
    code === 'app_auth_invalid_payload' ||
    code === 'app_auth_missing_token' ||
    code === 'app_auth_invalid_refresh' ||
    code === 'app_auth_refresh_expired' ||
    code === 'app_auth_refresh_reuse_detected' ||
    code === 'app_auth_missing_refresh' ||
    code === 'jwt_auth_invalid_token' ||
    code === 'jwt_auth_expired_token'
  ) {
    return true
  }
  const msg = String(message || '')
  if (/token.*(expir|invalid|malformed)/i.test(msg)) return true
  return false
}

function isAuthEndpointPath(path) {
  const p = String(path || '')
  return (
    p.includes(ENDPOINTS.auth.login) ||
    p.includes(ENDPOINTS.auth.refresh) ||
    p.includes(ENDPOINTS.auth.register) ||
    p.includes(ENDPOINTS.auth.forgotPassword) ||
    p.includes(ENDPOINTS.auth.resetPassword)
  )
}

/**
 * Refresh silencieux (cookie httpOnly). Utilisé au bootstrap et sur 401.
 * Une seule requête à la fois (mutex) — évite la rotation double (StrictMode / multi-onglets).
 * @returns {Promise<{ accessToken: string, expiresIn?: number, user?: object }>}
 */
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const url = resolveUrl(ENDPOINTS.auth.refresh, { appApi: true })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })
      const body = await res.json().catch(() => null)

      if (!res.ok || !body?.success || !body?.data?.accessToken) {
        clearToken()
        const err = new Error(parseErrorMessage(res.status, body, res.statusText))
        err.status = res.status
        err.body = body
        err.code = extractErrorCode(body)
        throw err
      }

      setToken(body.data.accessToken)
      return body.data
    } finally {
      clearTimeout(timer)
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * @param {string} path
 * @param {RequestInit & {
 *   token?: string|null,
 *   skipAuth?: boolean,
 *   auth?: boolean|null,
 *   suppressUnauthorized?: boolean,
 *   appApi?: boolean,
 *   _retry?: boolean,
 * }} [options]
 */
export async function apiFetch(path, options = {}) {
  const {
    token,
    headers,
    skipAuth = false,
    auth = null,
    suppressUnauthorized = false,
    appApi = false,
    _retry = false,
    ...rest
  } = options

  const method = (rest.method || 'GET').toUpperCase()
  const hasBody = rest.body != null && rest.body !== ''
  const isFormData = typeof FormData !== 'undefined' && rest.body instanceof FormData

  let authToken = null
  if (!skipAuth) {
    if (token !== undefined) {
      authToken = token
    } else if (auth === true || (auth !== false && method !== 'GET')) {
      authToken = getToken()
    } else if (appApi && auth !== false) {
      authToken = getToken()
    }
  }

  const url = resolveUrl(path, { appApi })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  if (rest.signal) {
    rest.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  let res
  try {
    res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
    })
  } catch (networkErr) {
    clearTimeout(timer)
    const aborted = networkErr.name === 'AbortError'
    const error = new Error(aborted ? 'Délai d’attente dépassé' : networkErr.message || 'Réseau indisponible')
    error.status = 0
    error.code = aborted ? 'timeout' : 'network_error'
    throw error
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null)

  if (!res.ok) {
    const error = new Error(parseErrorMessage(res.status, body, res.statusText))
    error.status = res.status
    error.body = body
    error.code = extractErrorCode(body)

    const canRefresh =
      !_retry &&
      !skipAuth &&
      !isAuthEndpointPath(path) &&
      isAppApiUrl(url) &&
      isAuthFailure(res.status, error.code, error.message)

    if (canRefresh) {
      try {
        await refreshAccessToken()
        return apiFetch(path, { ...options, _retry: true, token: undefined })
      } catch (refreshErr) {
        if (!suppressUnauthorized) {
          clearToken()
          onUnauthorized?.(refreshErr)
        }
        throw refreshErr
      }
    }

    if (
      res.status === 401 &&
      !suppressUnauthorized &&
      isAuthFailure(res.status, error.code, error.message)
    ) {
      clearToken()
      onUnauthorized?.(error)
    }

    throw error
  }

  // Contrat App API : déballer data
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data
  }

  return body
}

/**
 * Raccourci pour les routes /app/v1/*
 */
export function appApiFetch(path, options = {}) {
  return apiFetch(path, { ...options, appApi: true })
}

export { API_BASE, APP_API_BASE }
