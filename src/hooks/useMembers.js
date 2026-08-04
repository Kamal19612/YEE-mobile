import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMembers, updateFriendship } from '../api/members'
import { demoMembers } from '../data/membersData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function sortMembers(list, sort) {
  const copy = [...list]
  if (sort === 'newest') {
    return copy.sort((a, b) => new Date(b.joined) - new Date(a.joined))
  }
  if (sort === 'alphabetical') {
    return copy.sort((a, b) => a.displayName.localeCompare(b.displayName))
  }
  return copy.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))
}

function filterMembers(list, { search, typeFilter, country, region, language, thematic }) {
  let result = list
  if (typeFilter === 'online') result = result.filter((m) => m.online)
  if (typeFilter === 'friends') {
    result = result.filter((m) => m.friendshipStatus === 'is_friend' || m.friendshipStatus === 'self')
  }
  if (country) result = result.filter((m) => m.country === country)
  if (region) result = result.filter((m) => m.region === region)
  if (language) result = result.filter((m) => m.language === language)
  if (thematic) result = result.filter((m) => m.thematic === thematic)
  const q = search.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.mentionName.toLowerCase().includes(q) ||
        (m.location || '').toLowerCase().includes(q) ||
        (m.country || '').toLowerCase().includes(q) ||
        (m.thematic || '').toLowerCase().includes(q),
    )
  }
  return result
}

export function useMembers({
  sort = 'active',
  typeFilter = 'all',
  search = '',
  country = '',
  region = '',
  language = '',
  thematic = '',
} = {}) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 350))
        setMembers(demoMembers)
      } else {
        const list = await fetchMembers({ type: sort, search })
        setMembers(list)
      }
    } catch (err) {
      if (USE_MOCK) setMembers(demoMembers)
      else setError(err.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [sort, search])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () =>
      sortMembers(
        filterMembers(members, { search, typeFilter, country, region, language, thematic }),
        sort,
      ),
    [members, search, typeFilter, sort, country, region, language, thematic],
  )

  const toggleFriend = useCallback(async (id) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        if (m.friendshipStatus === 'is_friend') {
          return { ...m, friendshipStatus: 'not_friends', stats: { ...m.stats, friends: Math.max(0, m.stats.friends - 1) } }
        }
        if (m.friendshipStatus === 'pending') {
          return { ...m, friendshipStatus: 'not_friends' }
        }
        return { ...m, friendshipStatus: 'pending' }
      }),
    )
    if (!USE_MOCK) {
      try {
        await updateFriendship(id, { action: 'create' })
      } catch {
        load()
      }
    }
  }, [load])

  return { members: visible, total: visible.length, loading, error, toggleFriend, reload: load }
}

export function useMember(id) {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 250))
          const found = demoMembers.find((m) => String(m.id) === String(id)) || null
          if (alive) setMember(found)
        } else {
          const { fetchMember } = await import('../api/members')
          const data = await fetchMember(id)
          if (alive) setMember(data)
        }
      } catch (err) {
        if (alive) {
          const found = demoMembers.find((m) => String(m.id) === String(id)) || null
          if (found) setMember(found)
          else setError(err.message || 'Member not found')
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

  const updateProfile = useCallback((patch) => {
    setMember((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const updateXprofileField = useCallback((groupId, fieldId, value) => {
    setMember((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        xprofile: prev.xprofile.map((g) =>
          g.id === groupId
            ? {
                ...g,
                fields: g.fields.map((f) => (f.id === fieldId ? { ...f, value } : f)),
              }
            : g,
        ),
      }
    })
  }, [])

  const toggleFriend = useCallback(async () => {
    setMember((prev) => {
      if (!prev || prev.friendshipStatus === 'self') return prev
      let nextStatus = 'pending'
      let friendsDelta = 0
      if (prev.friendshipStatus === 'is_friend') {
        nextStatus = 'not_friends'
        friendsDelta = -1
      } else if (prev.friendshipStatus === 'pending') {
        nextStatus = 'not_friends'
      } else {
        nextStatus = 'pending'
      }
      const updated = {
        ...prev,
        friendshipStatus: nextStatus,
        stats: {
          ...prev.stats,
          friends: Math.max(0, (prev.stats?.friends || 0) + friendsDelta),
        },
      }
      const idx = demoMembers.findIndex((m) => m.id === prev.id)
      if (idx >= 0) demoMembers[idx] = { ...demoMembers[idx], ...updated }
      return updated
    })
    if (!USE_MOCK) {
      try {
        await updateFriendship(id, { action: 'create' })
      } catch {
        /* keep optimistic UI */
      }
    }
  }, [id])

  return { member, loading, error, updateProfile, updateXprofileField, toggleFriend }
}
