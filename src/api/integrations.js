import { apiFetch } from './client'

/** Stubs REST pour intégrations Phase 6 */

export async function fetchProducts({ token } = {}) {
  return apiFetch('/wc/v3/products', { token })
}

export async function fetchCourses({ token } = {}) {
  return apiFetch('/ldlms/v2/sfwd-courses', { token })
}

export async function fetchEvents({ token } = {}) {
  return apiFetch('/tribe/events/v1/events', { token })
}

export async function fetchJobs({ token } = {}) {
  return apiFetch('/wp/v2/job-listings', { token })
}

export async function fetchMembershipPlans({ token } = {}) {
  return apiFetch('/mp/v1/memberships', { token })
}
