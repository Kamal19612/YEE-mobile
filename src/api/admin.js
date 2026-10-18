import { ENDPOINTS } from '../config/api'
import { appApiFetch } from './client'

function qs(params) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    sp.set(key, String(value))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function fetchAdminAccounts({ q = '', status = 'all', page = 1, perPage = 20 } = {}) {
  const result = await appApiFetch(`${ENDPOINTS.admin.accounts}${qs({ q, status, page, perPage })}`, {
    auth: true,
    raw: true,
  })
  const accounts = Array.isArray(result?.data) ? result.data : []
  const meta = result?.meta || {}
  const total = Number(meta.total ?? accounts.length)
  const totalPages = Number(meta.totalPages ?? Math.max(1, Math.ceil(total / perPage)))
  return {
    accounts,
    meta: {
      page: Number(meta.page ?? page),
      perPage: Number(meta.perPage ?? perPage),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

export async function fetchAdminAccount(userId) {
  return appApiFetch(ENDPOINTS.admin.account(userId), { auth: true })
}

export async function fetchAdminAccountActivity(userId, { types, before, limit = 40 } = {}) {
  const result = await appApiFetch(
    `${ENDPOINTS.admin.accountActivity(userId)}${qs({ types, before, limit })}`,
    { auth: true, raw: true },
  )
  return {
    items: Array.isArray(result?.data) ? result.data : [],
    meta: result?.meta || {},
  }
}

export async function patchAdminAccount(userId, payload) {
  return appApiFetch(ENDPOINTS.admin.account(userId), {
    method: 'PATCH',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function revokeAdminAccountSessions(userId) {
  return appApiFetch(ENDPOINTS.admin.revokeSessions(userId), {
    method: 'POST',
    auth: true,
  })
}

export async function deleteAdminAccount(userId) {
  return appApiFetch(ENDPOINTS.admin.deleteAccount(userId), {
    method: 'DELETE',
    auth: true,
  })
}
