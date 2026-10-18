import { API_BASE, APP_API_BASE, API_TIMEOUT_MS, ENDPOINTS } from '../config/api'

/**
 * Client HTTP centralisé (fetch).
 *
 * - Access token : mémoire uniquement (XSS) — jamais localStorage
 * - Refresh : cookie httpOnly `app_refresh_token` (credentials: include)
 * - File d’attente sur 401 : une seule requête /auth/refresh à la fois
 * - Contrat API : { success, data } | { success: false, error }
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
  if (!path) return appApi ? APP_API_BASE || '/api' : API_BASE || '/api'
  if (path.startsWith('http')) return path

  const base = appApi ? APP_API_BASE : API_BASE

  if (path === base || path.startsWith(`${base}/`)) return path
  if (path.startsWith('/app/v1') || path.startsWith('app/v1')) {
    const rest = path.replace(/^\/?app\/v1/, '')
    return `${base}${rest.startsWith('/') ? rest : `/${rest}`}`
  }
  // Chemins déjà préfixés /api (médias, fichiers) → ne pas doubler
  if (base === '/api' && (path === '/api' || path.startsWith('/api/'))) {
    return path
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function isAppApiUrl(url) {
  if (!url) return false
  const path = url.startsWith('http') ? new URL(url).pathname : url
  if (APP_API_BASE && (url.startsWith(APP_API_BASE) || path.startsWith(APP_API_BASE))) {
    return true
  }
  // Same-origin /api/* + avatars/covers hors préfixe
  if (/^\/api(\/|$)/.test(path)) return true
  if (/^\/media\/(?:avatars|covers)\//.test(path)) return true
  return url.includes('/app/v1')
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
 *   timeoutMs?: number,
 *   onUploadProgress?: (pct: number) => void,
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
    raw = false,
    _retry = false,
    timeoutMs = API_TIMEOUT_MS,
    onUploadProgress,
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
  const waitMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : API_TIMEOUT_MS

  const requestHeaders = {
    ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...headers,
  }

  /** fetch ne expose pas la progression d’upload — XHR uniquement si callback fourni. */
  const useXhrProgress =
    typeof onUploadProgress === 'function' && isFormData && typeof XMLHttpRequest !== 'undefined'

  let res
  let body
  try {
    if (useXhrProgress) {
      const xhrResult = await xhrFormUpload({
        url,
        method,
        body: rest.body,
        headers: requestHeaders,
        timeoutMs: waitMs,
        signal: rest.signal,
        onUploadProgress,
      })
      res = { ok: xhrResult.status >= 200 && xhrResult.status < 300, status: xhrResult.status, statusText: xhrResult.statusText }
      body = xhrResult.body
      if (res.status === 204) return null
    } else {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), waitMs)
      if (rest.signal) {
        rest.signal.addEventListener('abort', () => controller.abort(), { once: true })
      }
      try {
        res = await fetch(url, {
          ...rest,
          signal: controller.signal,
          credentials: 'include',
          headers: requestHeaders,
        })
      } finally {
        clearTimeout(timer)
      }
      if (res.status === 204) return null
      const contentType = res.headers.get('content-type') || ''
      body = contentType.includes('application/json')
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null)
    }
  } catch (networkErr) {
    const aborted = networkErr.name === 'AbortError' || networkErr.code === 'timeout'
    const error = new Error(aborted ? 'Délai d’attente dépassé' : networkErr.message || 'Réseau indisponible')
    error.status = 0
    error.code = aborted ? 'timeout' : 'network_error'
    throw error
  }

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

  // Contrat App API : déballer data (sauf raw → conserver meta)
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    if (raw) {
      return { data: body.data, meta: body.meta || null }
    }
    return body.data
  }

  return body
}

/**
 * Upload FormData avec événements de progression (0–100).
 * @returns {Promise<{ status: number, statusText: string, body: any }>}
 */
function xhrFormUpload({ url, method, body, headers, timeoutMs, signal, onUploadProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method || 'POST', url, true)
    xhr.withCredentials = true
    xhr.timeout = timeoutMs

    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value != null && value !== '') xhr.setRequestHeader(key, String(value))
    })

    const onAbort = () => {
      xhr.abort()
      const err = new Error('Délai d’attente dépassé')
      err.name = 'AbortError'
      err.code = 'timeout'
      reject(err)
    }
    if (signal) {
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return
      const pct = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onUploadProgress(pct)
    }
    xhr.upload.onload = () => onUploadProgress(100)

    xhr.onload = () => {
      signal?.removeEventListener('abort', onAbort)
      if (xhr.status === 204) {
        resolve({ status: 204, statusText: xhr.statusText, body: null })
        return
      }
      const ct = xhr.getResponseHeader('content-type') || ''
      let parsed = null
      if (ct.includes('application/json')) {
        try {
          parsed = JSON.parse(xhr.responseText || 'null')
        } catch {
          parsed = null
        }
      } else {
        parsed = xhr.responseText
      }
      resolve({ status: xhr.status, statusText: xhr.statusText, body: parsed })
    }

    xhr.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      const err = new Error('Réseau indisponible')
      err.code = 'network_error'
      reject(err)
    }

    xhr.ontimeout = () => {
      signal?.removeEventListener('abort', onAbort)
      const err = new Error('Délai d’attente dépassé')
      err.name = 'AbortError'
      err.code = 'timeout'
      reject(err)
    }

    onUploadProgress(0)
    xhr.send(body)
  })
}

/**
 * Raccourci pour les routes API Spring (auth, users, feed, …).
 */
export function appApiFetch(path, options = {}) {
  return apiFetch(path, { ...options, appApi: true })
}

export { API_BASE, APP_API_BASE }
