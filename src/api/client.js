import { API_BASE, TOKEN_STORAGE_KEY } from '../config/api'

/** @typedef {{ status: number, message: string, body?: unknown }} ApiErrorShape */

let memoryToken = null
let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : null
}

export function getToken() {
  if (memoryToken) return memoryToken
  try {
    memoryToken = sessionStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    memoryToken = null
  }
  return memoryToken
}

export function setToken(token) {
  memoryToken = token || null
  try {
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
    else sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearToken() {
  setToken(null)
}

function parseErrorMessage(status, body, statusText) {
  if (!body || typeof body !== 'object') {
    return `API ${status}: ${statusText || 'Error'}`
  }
  return (
    body.message ||
    body.error ||
    body.data?.message ||
    (Array.isArray(body) && body[0]?.message) ||
    `API ${status}: ${statusText || 'Error'}`
  )
}

/**
 * Client HTTP centralisé.
 * - Préfixe VITE_WP_API_URL
 * - Injecte Bearer si token présent (option.token override possible)
 * - 401 → clearToken + handler (déconnexion / redirect login)
 */
export async function apiFetch(path, options = {}) {
  const { token, headers, skipAuth = false, ...rest } = options
  const authToken = skipAuth ? null : token !== undefined ? token : getToken()

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

  let res
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
    })
  } catch (networkErr) {
    const error = new Error(networkErr.message || 'Réseau indisponible')
    error.status = 0
    throw error
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

    if (res.status === 401) {
      clearToken()
      onUnauthorized?.(error)
    }

    throw error
  }

  return body
}

export { API_BASE }
