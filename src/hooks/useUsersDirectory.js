import { useCallback, useEffect, useState } from 'react'
import i18n from '../i18n'
import { fetchUsersDirectory, followUser, unfollowUser } from '../api/users'
import { useAuth } from './useAuth'
import { invalidate, nudgeNotifications, QueryKeys } from '../lib/queryEvents'
import { useBackgroundSync } from '../lib/useBackgroundSync'

const DEFAULT_PER_PAGE = 12
const SEARCH_DEBOUNCE_MS = 300

function sameId(a, b) {
  return a != null && b != null && String(a) === String(b)
}

/**
 * Annuaire public — GET /users?search=&institutionId=&page=&perPage=
 */
export function useUsersDirectory({
  search = '',
  institutionId = null,
  page = 1,
  perPage = DEFAULT_PER_PAGE,
} = {}) {
  const { user } = useAuth()
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
  const [actionError, setActionError] = useState(null)
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        const result = await fetchUsersDirectory({
          search: debouncedSearch.trim(),
          institutionId,
          page,
          perPage,
        })
        setUsers(result.users)
        setMeta(result.meta)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
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
        if (!silent) setLoading(false)
      }
    },
    [debouncedSearch, institutionId, page, perPage],
  )

  useEffect(() => {
    load({ silent: false })
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onMembersSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deleteAccount' && detail.authorId) {
        setUsers((prev) => prev.filter((m) => !sameId(m.id, detail.authorId)))
        return
      }
      return silentReload()
    },
    [silentReload],
  )
  useBackgroundSync(QueryKeys.members, onMembersSync)

  const toggleFollow = useCallback(
    async (id) => {
      if (!user?.id || sameId(user.id, id)) return
      setActionError(null)
      const target = users.find((m) => sameId(m.id, id))
      if (!target) return
      const wasFollowing = Boolean(target.isFollowing || target.friendshipStatus === 'is_friend')
      const snapshot = users
      setUsers((prev) =>
        prev.map((m) =>
          sameId(m.id, id)
            ? {
                ...m,
                isFollowing: !wasFollowing,
                friendshipStatus: wasFollowing ? 'not_friends' : 'is_friend',
              }
            : m,
        ),
      )
      try {
        if (wasFollowing) await unfollowUser(id)
        else await followUser(id)
        invalidate(QueryKeys.members, { reason: 'follow', userId: id })
        if (!wasFollowing) nudgeNotifications({ reason: 'follow', userId: id })
      } catch (err) {
        setUsers(snapshot)
        setActionError(err.message || i18n.t('members.connectError'))
        throw err
      }
    },
    [user?.id, users],
  )

  return {
    users,
    meta,
    loading,
    error: error || actionError,
    actionError,
    total: meta.total,
    hasNext: meta.hasNext,
    hasPrev: meta.hasPrev,
    toggleFollow,
  }
}
