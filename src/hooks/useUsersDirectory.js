import { useEffect, useState } from 'react'
import { fetchUsersDirectory } from '../api/users'

const DEFAULT_PER_PAGE = 12
const SEARCH_DEBOUNCE_MS = 300

/**
 * Annuaire public — GET /users?search=&institutionId=&page=&perPage=
 * Indépendant de `useMembers` (profil / follow / BP stub).
 */
export function useUsersDirectory({
  search = '',
  institutionId = null,
  page = 1,
  perPage = DEFAULT_PER_PAGE,
} = {}) {
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({
    page: 1,
    perPage,
    total: null,
    totalPages: null,
    hasNext: false,
    hasPrev: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchUsersDirectory({
          search: debouncedSearch.trim(),
          institutionId,
          page,
          perPage,
        })
        if (!alive) return
        setUsers(result.users)
        setMeta(result.meta)
      } catch (err) {
        if (!alive) return
        setUsers([])
        setMeta({
          page,
          perPage,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: page > 1,
        })
        setError(err.message || 'Impossible de charger les membres')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [debouncedSearch, institutionId, page, perPage])

  return {
    users,
    meta,
    loading,
    error,
    total: meta.total,
    hasNext: meta.hasNext,
    hasPrev: meta.hasPrev,
  }
}
