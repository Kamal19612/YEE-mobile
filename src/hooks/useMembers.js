import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMembers, updateFriendship } from '../api/members'
import {
  fetchMyProfile,
  fetchPublicProfile,
  followUser,
  unfollowUser,
  updateProfileField,
} from '../api/users'
import { USE_MOCK } from '../config/api'
import { demoMembers } from '../data/membersData'
import { useAuth } from './useAuth'

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

  const toggleFriend = useCallback(
    async (id) => {
      const target = members.find((m) => m.id === id)
      const wasFriend = target?.friendshipStatus === 'is_friend'
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m
          if (wasFriend) {
            return {
              ...m,
              friendshipStatus: 'not_friends',
              stats: { ...m.stats, friends: Math.max(0, m.stats.friends - 1) },
            }
          }
          return {
            ...m,
            friendshipStatus: 'is_friend',
            stats: { ...m.stats, friends: (m.stats.friends || 0) + 1 },
          }
        }),
      )
      if (!USE_MOCK) {
        try {
          if (wasFriend) await unfollowUser(id)
          else await followUser(id)
        } catch {
          try {
            await updateFriendship(id, { action: 'create' })
          } catch {
            load()
          }
        }
      }
    },
    [load, members],
  )

  return { members: visible, total: visible.length, loading, error, toggleFriend, reload: load }
}

export function useMember(id) {
  const { user } = useAuth()
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
          const isSelf = Boolean(user && String(user.id) === String(id))
          const data = isSelf ? await fetchMyProfile() : await fetchPublicProfile(id)
          if (alive) setMember(data)
        }
      } catch (err) {
        if (alive) {
          try {
            const { fetchMember } = await import('../api/members')
            const data = await fetchMember(id)
            if (alive) setMember(data)
          } catch {
            const found = demoMembers.find((m) => String(m.id) === String(id)) || null
            if (found) setMember(found)
            else setError(err.message || 'Member not found')
          }
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [id, user])

  const updateProfile = useCallback((patch) => {
    setMember((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const updateXprofileField = useCallback(async (groupId, fieldId, value) => {
    setMember((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        ...(fieldId === 'bio' ? { bio: value } : {}),
        ...(fieldId === 'profession' ? { profession: value } : {}),
        ...(fieldId === 'organization' ? { organization: value } : {}),
        ...(fieldId === 'location' ? { location: value } : {}),
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
    if (!USE_MOCK) {
      try {
        const updated = await updateProfileField(fieldId, value)
        setMember(updated)
      } catch {
        /* garde l’UI optimiste */
      }
    }
  }, [])

  const toggleFriend = useCallback(async () => {
    let snapshot = null
    setMember((prev) => {
      if (!prev || prev.friendshipStatus === 'self') return prev
      snapshot = prev
      const isFriend = prev.friendshipStatus === 'is_friend'
      const friendsDelta = isFriend ? -1 : 1
      return {
        ...prev,
        friendshipStatus: isFriend ? 'not_friends' : 'is_friend',
        stats: {
          ...prev.stats,
          friends: Math.max(0, (prev.stats?.friends || 0) + friendsDelta),
          followers: Math.max(0, (prev.stats?.followers || 0) + friendsDelta),
        },
      }
    })
    if (!USE_MOCK && snapshot) {
      try {
        if (snapshot.friendshipStatus === 'is_friend') await unfollowUser(id)
        else await followUser(id)
      } catch {
        /* keep optimistic UI */
      }
    }
  }, [id])

  return { member, loading, error, updateProfile, updateXprofileField, toggleFriend }
}
