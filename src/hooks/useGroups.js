import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchGroup, fetchGroups, joinGroup, leaveGroup } from '../api/groups'
import { USE_MOCK } from '../config/api'
import { demoGroups } from '../data/groupsData'
import { useAuth } from './useAuth'

function applyFilters(list, { search, typeFilter, sort }) {
  let result = [...list]
  if (typeFilter === 'my') result = result.filter((g) => g.isMember)
  if (typeFilter === 'public') result = result.filter((g) => g.status === 'public')
  if (typeFilter === 'private') result = result.filter((g) => g.status === 'private')

  const q = search.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q),
    )
  }

  if (sort === 'popular') result.sort((a, b) => b.membersCount - a.membersCount)
  else if (sort === 'newest') result.sort((a, b) => new Date(b.created) - new Date(a.created))
  else if (sort === 'alphabetical') result.sort((a, b) => a.name.localeCompare(b.name))
  else result.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))

  return result
}

export function useGroups({ search = '', typeFilter = 'all', sort = 'active' } = {}) {
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest' }
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300))
        setGroups(demoGroups)
      } else {
        setGroups(await fetchGroups({ type: sort, search }))
      }
    } catch (err) {
      setError(err.message || 'Failed to load groups')
      if (USE_MOCK) setGroups(demoGroups)
    } finally {
      setLoading(false)
    }
  }, [sort, search])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () => applyFilters(groups, { search, typeFilter, sort }),
    [groups, search, typeFilter, sort],
  )

  const toggleMembership = useCallback(
    async (id) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g
          const joining = !g.isMember
          return {
            ...g,
            isMember: joining,
            membersCount: joining ? g.membersCount + 1 : Math.max(0, g.membersCount - 1),
            memberIds: joining
              ? [...new Set([...(g.memberIds || []), currentUser.id])]
              : (g.memberIds || []).filter((uid) => uid !== currentUser.id),
          }
        }),
      )
      if (!USE_MOCK) {
        try {
          const g = groups.find((x) => x.id === id)
          if (g?.isMember) await leaveGroup(id, { userId: currentUser.id })
          else await joinGroup(id)
        } catch {
          load()
        }
      }
    },
    [groups, load, currentUser.id],
  )

  const createGroup = useCallback(
    async ({ name, description, status = 'public' }) => {
      const group = {
        id: Date.now(),
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim() || 'Nouvelle cohorte AfrEA-YEE',
        status,
        cohortType: 'thematic',
        avatar: null,
        cover: null,
        membersCount: 1,
        lastActive: new Date().toISOString(),
        created: new Date().toISOString(),
        isMember: true,
        isAdmin: true,
        isMod: false,
        memberIds: [currentUser.id],
        admins: [{ id: currentUser.id, displayName: currentUser.displayName }],
      }
      if (USE_MOCK) demoGroups.unshift(group)
      setGroups((prev) => [group, ...prev])
      return group
    },
    [currentUser],
  )

  return {
    groups: visible,
    total: visible.length,
    loading,
    error,
    toggleMembership,
    createGroup,
    reload: load,
  }
}

export function useGroup(id) {
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 200))
          const found = demoGroups.find((g) => String(g.id) === String(id)) || null
          if (alive) setGroup(found)
        } else {
          const data = await fetchGroup(id)
          if (alive) setGroup(data)
        }
      } catch (err) {
        const found = demoGroups.find((g) => String(g.id) === String(id)) || null
        if (alive) {
          if (found) setGroup(found)
          else setError(err.message || 'Group not found')
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [id])

  const patch = useCallback((fn) => setGroup((prev) => (prev ? fn(prev) : prev)), [])

  return { group, loading, error, patch }
}
