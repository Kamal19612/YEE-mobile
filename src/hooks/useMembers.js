import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMembers } from '../api/members'
import {
  fetchFollowingIds,
  fetchMyProfile,
  fetchPublicProfile,
  followUser,
  unfollowUser,
  updateProfileField,
  uploadAvatar,
  uploadCover,
  validateProfileImage,
} from '../api/users'
import { mapWithSessionMedia, sameUserId, withSessionMedia } from '../utils/sessionMedia'
import { useAuth } from './useAuth'

function activityTimestamp(value) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function sortMembers(list, sort) {
  const copy = [...list]
  if (sort === 'newest') {
    return copy.sort((a, b) => activityTimestamp(b.joined) - activityTimestamp(a.joined))
  }
  if (sort === 'alphabetical') {
    return copy.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }))
  }
  // Activité récente : plus récents d'abord ; sans date → en bas
  return copy.sort((a, b) => {
    const diff = activityTimestamp(b.lastActive) - activityTimestamp(a.lastActive)
    if (diff !== 0) return diff
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  })
}

function filterMembers(list, { search, typeFilter, country, region, language, thematic }) {
  let result = list
  if (typeFilter === 'online') result = result.filter((m) => m.online)
  if (typeFilter === 'friends') {
    result = result.filter(
      (m) => m.friendshipStatus === 'is_friend' || m.isFollowing || m.friendshipStatus === 'self',
    )
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

/** Applique le statut follow App API (pas BuddyPress friends). */
function applyFollowState(member, followingIds, currentUserId) {
  if (!member) return member
  if (sameUserId(member.id, currentUserId)) {
    return { ...member, friendshipStatus: 'self', isFollowing: false }
  }
  const following = followingIds?.has(String(member.id))
  return {
    ...member,
    isFollowing: Boolean(following),
    friendshipStatus: following ? 'is_friend' : 'not_friends',
  }
}

export function useMembers({
  sort = 'alphabetical',
  typeFilter = 'all',
  search = '',
  country = '',
  region = '',
  language = '',
  thematic = '',
} = {}) {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followError, setFollowError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let list = mapWithSessionMedia(await fetchMembers({ type: sort, search }), user)
      if (user?.id) {
        try {
          const followingIds = await fetchFollowingIds(user.id)
          list = list.map((m) => applyFollowState(m, followingIds, user.id))
        } catch {
          /* liste utilisable même si follow status indisponible */
        }
      }
      setMembers(list)
    } catch (err) {
      setError(err.message || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [sort, search, user])

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
      setFollowError(null)
      const target = members.find((m) => sameUserId(m.id, id))
      if (!target || target.friendshipStatus === 'self') return

      const wasFollowing = Boolean(target.isFollowing || target.friendshipStatus === 'is_friend')
      const snapshot = members

      setMembers((prev) =>
        prev.map((m) => {
          if (!sameUserId(m.id, id)) return m
          if (wasFollowing) {
            return {
              ...m,
              isFollowing: false,
              friendshipStatus: 'not_friends',
              stats: {
                ...m.stats,
                friends: Math.max(0, (m.stats?.friends || 0) - 1),
                followers: Math.max(0, (m.stats?.followers || 0) - 1),
              },
            }
          }
          return {
            ...m,
            isFollowing: true,
            friendshipStatus: 'is_friend',
            stats: {
              ...m.stats,
              friends: (m.stats?.friends || 0) + 1,
              followers: (m.stats?.followers || 0) + 1,
            },
          }
        }),
      )

      try {
        if (wasFollowing) await unfollowUser(id)
        else await followUser(id)
      } catch (err) {
        setMembers(snapshot)
        setFollowError(err.message || 'Impossible de mettre à jour le suivi')
      }
    },
    [members],
  )

  return {
    members: visible,
    total: visible.length,
    loading,
    error: error || followError,
    toggleFriend,
    reload: load,
  }
}

export function useMember(id) {
  const { user, patchUser } = useAuth()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followError, setFollowError] = useState(null)
  const [mediaBusy, setMediaBusy] = useState(null)
  const [mediaError, setMediaError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const isSelf = Boolean(user && sameUserId(user.id, id))
        let data = isSelf ? await fetchMyProfile() : await fetchPublicProfile(id)
        if (!isSelf && user?.id && typeof data?.isFollowing !== 'boolean') {
          try {
            const followingIds = await fetchFollowingIds(user.id)
            data = applyFollowState(data, followingIds, user.id)
          } catch {
            /* ignore */
          }
        } else if (!isSelf && data) {
          data = {
            ...data,
            friendshipStatus: data.isFollowing ? 'is_friend' : 'not_friends',
          }
        }
        if (alive) setMember(withSessionMedia(data, user))
      } catch (err) {
        if (alive) {
          try {
            const { fetchMember } = await import('../api/members')
            const data = await fetchMember(id)
            if (alive) {
              let m = withSessionMedia(data, user)
              if (user?.id && !sameUserId(user.id, id)) {
                try {
                  const followingIds = await fetchFollowingIds(user.id)
                  m = applyFollowState(m, followingIds, user.id)
                } catch {
                  /* ignore */
                }
              }
              setMember(m)
            }
          } catch {
            setError(err.message || 'Member not found')
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
    try {
      const updated = await updateProfileField(fieldId, value)
      setMember(updated)
    } catch {
      /* garde l’UI optimiste */
    }
  }, [])

  const toggleFriend = useCallback(async () => {
    setFollowError(null)
    let snapshot = null
    let wasFollowing = false

    setMember((prev) => {
      if (!prev || prev.friendshipStatus === 'self') return prev
      snapshot = prev
      wasFollowing = Boolean(prev.isFollowing || prev.friendshipStatus === 'is_friend')
      const delta = wasFollowing ? -1 : 1
      return {
        ...prev,
        isFollowing: !wasFollowing,
        friendshipStatus: wasFollowing ? 'not_friends' : 'is_friend',
        stats: {
          ...prev.stats,
          friends: Math.max(0, (prev.stats?.friends || 0) + delta),
          followers: Math.max(0, (prev.stats?.followers || 0) + delta),
        },
      }
    })

    if (!snapshot) return

    try {
      if (wasFollowing) await unfollowUser(id)
      else await followUser(id)
    } catch (err) {
      setMember(snapshot)
      setFollowError(err.message || 'Impossible de mettre à jour le suivi')
    }
  }, [id])

  const changeAvatar = useCallback(
    async (file) => {
      const clientErr = validateProfileImage(file)
      if (clientErr) {
        setMediaError(clientErr)
        throw new Error(clientErr)
      }
      setMediaError(null)
      setMediaBusy('avatar')
      try {
        const { url } = await uploadAvatar(file)
        setMember((prev) => (prev ? { ...prev, avatar: url } : prev))
        patchUser?.({ avatar: url })
        return { url }
      } catch (err) {
        setMediaError(err.message || 'Échec de l’upload avatar')
        throw err
      } finally {
        setMediaBusy(null)
      }
    },
    [patchUser],
  )

  const changeCover = useCallback(
    async (file) => {
      const clientErr = validateProfileImage(file)
      if (clientErr) {
        setMediaError(clientErr)
        throw new Error(clientErr)
      }
      setMediaError(null)
      setMediaBusy('cover')
      try {
        const { url } = await uploadCover(file)
        setMember((prev) => (prev ? { ...prev, cover: url } : prev))
        patchUser?.({ cover: url })
        return { url }
      } catch (err) {
        setMediaError(err.message || 'Échec de l’upload couverture')
        throw err
      } finally {
        setMediaBusy(null)
      }
    },
    [patchUser],
  )

  return {
    member,
    loading,
    error: error || followError,
    mediaBusy,
    mediaError,
    updateProfile,
    updateXprofileField,
    toggleFriend,
    changeAvatar,
    changeCover,
  }
}
