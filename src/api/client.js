/**
 * Client REST de base pour WordPress headless.
 * Les endpoints métier (activity, members, …) arriveront dès la Phase 2.
 */

const API_BASE = import.meta.env.VITE_WP_API_URL || '/wp-json'

export async function apiFetch(path, options = {}) {
  const { token, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  })

  if (!res.ok) {
    const error = new Error(`API ${res.status}: ${res.statusText}`)
    error.status = res.status
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

export { API_BASE }
