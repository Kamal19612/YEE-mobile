import { useCallback, useEffect, useState } from 'react'
import i18n from '../i18n'
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
import { invalidate, nudgeNotifications, QueryKeys } from '../lib/queryEvents'
import { useBackgroundSync } from '../lib/useBackgroundSync'
import { sameUserId, withSessionMedia } from '../utils/sessionMedia'
import { useAuth } from './useAuth'

/** Applique le statut follow App API. */
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

export function useMember(id) {
  const { user, patchUser } = useAuth()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followError, setFollowError] = useState(null)
  const [mediaBusy, setMediaBusy] = useState(null)
  const [mediaError, setMediaError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (id == null || id === '') {
        setMember(null)
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      if (!silent) setError(null)
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
        setMember(withSessionMedia(data, user))
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setMember(null)
        setError(err.message || 'Member not found')
      } finally {
        if (!silent) setLoading(false)
        else setLoading(false)
      }
    },
    [id, user],
  )

  useEffect(() => {
    load({ silent: false })
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onMemberSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deleteAccount' && String(detail.authorId) === String(id)) {
        setMember(null)
        setError(null)
        return
      }
      return silentReload()
    },
    [id, silentReload],
  )
  useBackgroundSync(QueryKeys.members, onMemberSync, { enabled: Boolean(id) })

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
      invalidate(QueryKeys.members, { reason: 'profileUpdate', userId: id })
    } catch {
      /* garde l’UI optimiste */
    }
  }, [id])

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
      invalidate(QueryKeys.members, { reason: 'follow', userId: id })
      if (!wasFollowing) nudgeNotifications({ reason: 'follow', userId: id })
    } catch (err) {
      setMember(snapshot)
      setFollowError(err.message || i18n.t('members.connectError'))
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
        invalidate(QueryKeys.members, { reason: 'avatar', userId: id })
        return { url }
      } catch (err) {
        setMediaError(err.message || 'Échec de l’upload avatar')
        throw err
      } finally {
        setMediaBusy(null)
      }
    },
    [patchUser, id],
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
        invalidate(QueryKeys.members, { reason: 'cover', userId: id })
        return { url }
      } catch (err) {
        setMediaError(err.message || 'Échec de l’upload couverture')
        throw err
      } finally {
        setMediaBusy(null)
      }
    },
    [patchUser, id],
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
    reload: () => load({ silent: false }),
    silentReload,
  }
}
