import { JWT_AUTH_ENDPOINT } from '../config/api'
import { apiFetch, clearToken, getToken, setToken } from './client'

/**
 * Authentification Simple JWT Login
 * POST …/simple-jwt-login/v1/auth
 */

function extractJwt(payload) {
  if (!payload || typeof payload !== 'object') return null
  return (
    payload.jwt ||
    payload.token ||
    payload.data?.jwt ||
    payload.data?.token ||
    null
  )
}

export function mapWpUser(raw) {
  if (!raw) return null
  const avatar =
    raw.avatar_urls?.['96'] ||
    raw.avatar_urls?.['48'] ||
    raw.meta?.avatar ||
    null
  return {
    id: raw.id,
    displayName: raw.name || raw.slug || 'Member',
    mentionName: raw.slug || raw.nickname || String(raw.id),
    email: raw.email || '',
    avatar,
    role: Array.isArray(raw.roles) ? raw.roles[0] : raw.role || 'yee',
    roles: raw.roles || [],
    link: `/members/${raw.id}`,
  }
}

/**
 * @returns {{ jwt: string, raw: unknown }}
 */
export async function login(email, password) {
  const data = await apiFetch(JWT_AUTH_ENDPOINT, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  })

  const jwt = extractJwt(data)
  if (!jwt) {
    const err = new Error(
      data?.message || data?.data?.message || 'Réponse JWT invalide — vérifier Simple JWT Login',
    )
    err.status = 401
    err.body = data
    throw err
  }

  setToken(jwt)
  return { jwt, raw: data }
}

export function logout() {
  clearToken()
}

export async function getCurrentUser() {
  const token = getToken()
  if (!token) return null
  const raw = await apiFetch('/wp/v2/users/me?context=edit')
  return mapWpUser(raw)
}

export { getToken }
