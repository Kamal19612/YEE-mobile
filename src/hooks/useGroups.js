import { useCallback, useEffect, useState } from 'react'
import {
  approveMember as apiApproveMember,
  changeMemberRole as apiChangeMemberRole,
  createGroup as apiCreateGroup,
  deleteGroup as apiDeleteGroup,
  fetchGroup,
  fetchGroupMembers,
  fetchGroups,
  joinGroup as apiJoinGroup,
  leaveGroup as apiLeaveGroup,
  rejectMember as apiRejectMember,
  removeMember as apiRemoveMember,
  respondToInvitation as apiRespondToInvitation,
  updateGroup as apiUpdateGroup,
} from '../api/groups'
import { invalidate, invalidateMany, nudgeNotifications, QueryKeys } from '../lib/queryEvents'
import { useBackgroundSync } from '../lib/useBackgroundSync'

/**
 * Applique un statut viewer optimiste + ajustement membersCount.
 * Ne recalcule jamais le statut à partir d’autre chose que l’intention d’action.
 */
function withViewerStatus(group, nextStatus, { deltaMembers = 0, nextRole } = {}) {
  if (!group) return group
  return {
    ...group,
    viewerStatus: nextStatus,
    viewerRole: nextRole !== undefined ? nextRole : group.viewerRole,
    membersCount: Math.max(0, (group.membersCount || 0) + deltaMembers),
  }
}

/**
 * Liste des groupes — App API `GET /groups?search=&mine=`
 * Pas de fallback silencieux : les erreurs d’action remontent telles quelles.
 */
export function useGroups({ search = '', mine = false } = {}) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      setGroups(await fetchGroups({ search, mine }))
      if (silent) setError(null)
    } catch (err) {
      if (silent) return
      setError(err.message || 'Impossible de charger les groupes')
      setGroups([])
    } finally {
      if (!silent) setLoading(false)
      else setLoading(false)
    }
  }, [search, mine])

  useEffect(() => {
    load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onGroupsSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deleteGroup' && detail.groupId) {
        setGroups((prev) => prev.filter((g) => String(g.id) !== String(detail.groupId)))
        return
      }
      return silentReload()
    },
    [silentReload],
  )
  useBackgroundSync(QueryKeys.groups, onGroupsSync)

  const createGroup = useCallback(async ({ name, description, visibility = 'public' }) => {
    setActionError(null)
    try {
      const created = await apiCreateGroup({ name, description, visibility })
      setGroups((prev) => [created, ...prev.filter((g) => String(g.id) !== String(created.id))])
      invalidate(QueryKeys.groups, { reason: 'create', groupId: created?.id })
      return created
    } catch (err) {
      const code = err.code || err.body?.error?.code
      const message =
        code === 'forbidden'
          ? 'Réservé aux référents d’institution'
          : err.message || 'Impossible de créer le groupe'
      setActionError(message)
      throw err
    }
  }, [])

  const join = useCallback(
    async (id) => {
      setActionError(null)
      const target = groups.find((g) => String(g.id) === String(id))
      if (!target) return

      const snapshot = groups
      const optimisticStatus = target.visibility === 'private' ? 'pending' : 'active'
      const delta = optimisticStatus === 'active' ? 1 : 0

      setGroups((prev) =>
        prev.map((g) =>
          String(g.id) === String(id)
            ? withViewerStatus(g, optimisticStatus, {
                deltaMembers: delta,
                nextRole: optimisticStatus === 'active' ? 'member' : null,
              })
            : g,
        ),
      )

      try {
        const res = await apiJoinGroup(id)
        const status = res?.status || optimisticStatus
        setGroups((prev) =>
          prev.map((g) =>
            String(g.id) === String(id)
              ? withViewerStatus(
                  { ...g, membersCount: target.membersCount },
                  status,
                  {
                    deltaMembers: status === 'active' ? 1 : 0,
                    nextRole: status === 'active' ? 'member' : null,
                  },
                )
              : g,
          ),
        )
        invalidateMany([QueryKeys.groups, QueryKeys.groupMembers], { reason: 'join', groupId: id })
        if (status === 'pending') nudgeNotifications({ reason: 'groupJoinRequest', groupId: id })
        return res
      } catch (err) {
        setGroups(snapshot)
        setActionError(err.message || 'Impossible de rejoindre le groupe')
        throw err
      }
    },
    [groups],
  )

  const leave = useCallback(
    async (id) => {
      setActionError(null)
      const target = groups.find((g) => String(g.id) === String(id))
      if (!target || target.viewerIsCreator) return

      const snapshot = groups
      setGroups((prev) =>
        prev.map((g) =>
          String(g.id) === String(id)
            ? withViewerStatus(g, 'none', { deltaMembers: -1, nextRole: null })
            : g,
        ),
      )

      try {
        const res = await apiLeaveGroup(id)
        invalidateMany([QueryKeys.groups, QueryKeys.groupMembers, QueryKeys.feed], {
          reason: 'leave',
          groupId: id,
        })
        return res
      } catch (err) {
        setGroups(snapshot)
        setActionError(err.message || 'Impossible de quitter le groupe')
        throw err
      }
    },
    [groups],
  )

  const respondToInvitation = useCallback(
    async (id, accept) => {
      setActionError(null)
      const target = groups.find((g) => String(g.id) === String(id))
      if (!target) return

      const snapshot = groups
      const nextStatus = accept ? 'active' : 'none'
      setGroups((prev) =>
        prev.map((g) =>
          String(g.id) === String(id)
            ? withViewerStatus(g, nextStatus, {
                deltaMembers: accept ? 1 : 0,
                nextRole: accept ? 'member' : null,
              })
            : g,
        ),
      )

      try {
        const res = await apiRespondToInvitation(id, accept)
        invalidateMany([QueryKeys.groups, QueryKeys.groupMembers], {
          reason: 'inviteResponse',
          groupId: id,
          accept,
        })
        nudgeNotifications({ reason: 'inviteResponse', groupId: id })
        return res
      } catch (err) {
        setGroups(snapshot)
        setActionError(err.message || 'Impossible de répondre à l’invitation')
        throw err
      }
    },
    [groups],
  )

  const removeGroup = useCallback(async (id) => {
    setActionError(null)
    const snapshot = groups
    setGroups((prev) => prev.filter((g) => String(g.id) !== String(id)))
    try {
      await apiDeleteGroup(id)
      invalidateMany([QueryKeys.groups, QueryKeys.groupMembers, QueryKeys.feed], {
        reason: 'deleteGroup',
        groupId: id,
      })
    } catch (err) {
      setGroups(snapshot)
      setActionError(err.message || 'Impossible de supprimer le groupe')
      throw err
    }
  }, [groups])

  return {
    groups,
    total: groups.length,
    loading,
    error: error || actionError,
    actionError,
    createGroup,
    join,
    leave,
    respondToInvitation,
    removeGroup,
    reload: () => load({ silent: false }),
    silentReload,
  }
}

/** Détail d’un groupe — GET /groups/{id} */
export function useGroup(id) {
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (id == null || id === '') {
      setGroup(null)
      setLoading(false)
      setError(null)
      return
    }
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      setGroup(await fetchGroup(id))
      if (silent) setError(null)
    } catch (err) {
      if (silent) return
      setGroup(null)
      setError(err.message || 'Groupe introuvable')
    } finally {
      if (!silent) setLoading(false)
      else setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onGroupSync = useCallback(
    (detail) => {
      if (detail?.reason === 'deleteGroup' && String(detail.groupId) === String(id)) {
        setGroup(null)
        setError(null)
        return
      }
      return silentReload()
    },
    [id, silentReload],
  )
  useBackgroundSync([QueryKeys.groups, QueryKeys.groupMembers], onGroupSync, {
    enabled: id != null && id !== '',
  })

  return { group, setGroup, loading, error, reload: () => load({ silent: false }), silentReload }
}

export function useGroupAdmin(id, { group, setGroup } = {}) {
  const [actionError, setActionError] = useState(null)

  const updateGroup = useCallback(
    async (payload) => {
      setActionError(null)
      if (!id) return
      const snapshot = group
      try {
        const next = await apiUpdateGroup(id, payload)
        setGroup?.(next)
        invalidate(QueryKeys.groups, { reason: 'update', groupId: id })
        return next
      } catch (err) {
        if (snapshot) setGroup?.(snapshot)
        setActionError(err.message || 'Impossible de modifier le groupe')
        throw err
      }
    },
    [id, group, setGroup],
  )

  const deleteGroup = useCallback(async () => {
    setActionError(null)
    if (!id) return
    try {
      await apiDeleteGroup(id)
      invalidateMany([QueryKeys.groups, QueryKeys.groupMembers, QueryKeys.feed], {
        reason: 'deleteGroup',
        groupId: id,
      })
    } catch (err) {
      setActionError(err.message || 'Impossible de supprimer le groupe')
      throw err
    }
  }, [id])

  return { updateGroup, deleteGroup, actionError, clearActionError: () => setActionError(null) }
}

/**
 * Actions d’adhésion sur le groupe courant — mise à jour optimiste de viewerStatus.
 * Branche `setGroup` fourni par `useGroup` (même instance de state).
 */
export function useGroupMembership(id, { group, setGroup } = {}) {
  const [actionError, setActionError] = useState(null)

  const join = useCallback(async () => {
    setActionError(null)
    if (!group || !setGroup) return

    const snapshot = group
    const optimisticStatus = group.visibility === 'private' ? 'pending' : 'active'
    const delta = optimisticStatus === 'active' ? 1 : 0
    setGroup(
      withViewerStatus(group, optimisticStatus, {
        deltaMembers: delta,
        nextRole: optimisticStatus === 'active' ? 'member' : null,
      }),
    )

    try {
      const res = await apiJoinGroup(id)
      const status = res?.status || optimisticStatus
      setGroup(
        withViewerStatus(
          { ...snapshot, membersCount: snapshot.membersCount },
          status,
          {
            deltaMembers: status === 'active' ? 1 : 0,
            nextRole: status === 'active' ? 'member' : null,
          },
        ),
      )
      invalidateMany([QueryKeys.groups, QueryKeys.groupMembers, QueryKeys.feed], {
        reason: 'join',
        groupId: id,
      })
      if (status === 'pending') nudgeNotifications({ reason: 'groupJoinRequest', groupId: id })
      return res
    } catch (err) {
      setGroup(snapshot)
      setActionError(err.message || 'Impossible de rejoindre le groupe')
      throw err
    }
  }, [id, group, setGroup])

  const leave = useCallback(async () => {
    setActionError(null)
    if (!group || !setGroup || group.viewerIsCreator) return

    const snapshot = group
    setGroup(withViewerStatus(group, 'none', { deltaMembers: -1, nextRole: null }))

    try {
      const res = await apiLeaveGroup(id)
      invalidateMany([QueryKeys.groups, QueryKeys.groupMembers, QueryKeys.feed], {
        reason: 'leave',
        groupId: id,
      })
      return res
    } catch (err) {
      setGroup(snapshot)
      setActionError(err.message || 'Impossible de quitter le groupe')
      throw err
    }
  }, [id, group, setGroup])

  const respondToInvitation = useCallback(
    async (accept) => {
      setActionError(null)
      if (!group || !setGroup) return

      const snapshot = group
      const nextStatus = accept ? 'active' : 'none'
      setGroup(
        withViewerStatus(group, nextStatus, {
          deltaMembers: accept ? 1 : 0,
          nextRole: accept ? 'member' : null,
        }),
      )

      try {
        const res = await apiRespondToInvitation(id, accept)
        invalidateMany([QueryKeys.groups, QueryKeys.groupMembers, QueryKeys.feed], {
          reason: 'inviteResponse',
          groupId: id,
          accept,
        })
        nudgeNotifications({ reason: 'inviteResponse', groupId: id })
        return res
      } catch (err) {
        setGroup(snapshot)
        setActionError(err.message || 'Impossible de répondre à l’invitation')
        throw err
      }
    },
    [id, group, setGroup],
  )

  return { join, leave, respondToInvitation, actionError, clearActionError: () => setActionError(null) }
}

/**
 * Membres d’un groupe + actions modération.
 * `status` : active | pending | invited | banned
 */
export function useGroupMembers(id, status = 'active') {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (id == null || id === '') {
      setMembers([])
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    if (!silent) setError(null)
    try {
      setMembers(await fetchGroupMembers(id, { status }))
      if (silent) setError(null)
    } catch (err) {
      if (silent) return
      setMembers([])
      setError(err.message || 'Impossible de charger les membres')
    } finally {
      if (!silent) setLoading(false)
      else setLoading(false)
    }
  }, [id, status])

  useEffect(() => {
    load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  useBackgroundSync(QueryKeys.groupMembers, silentReload, {
    enabled: id != null && id !== '',
  })

  const approve = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = members
      setMembers((prev) => prev.filter((m) => String(m.user.id) !== String(userId)))
      try {
        const res = await apiApproveMember(id, userId)
        invalidateMany([QueryKeys.groupMembers, QueryKeys.groups], {
          reason: 'approve',
          groupId: id,
          userId,
        })
        nudgeNotifications({ reason: 'approve', groupId: id, userId })
        return res
      } catch (err) {
        setMembers(snapshot)
        setActionError(err.message || 'Impossible d’approuver')
        throw err
      }
    },
    [id, members],
  )

  const reject = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = members
      setMembers((prev) => prev.filter((m) => String(m.user.id) !== String(userId)))
      try {
        const res = await apiRejectMember(id, userId)
        invalidateMany([QueryKeys.groupMembers, QueryKeys.groups], {
          reason: 'reject',
          groupId: id,
          userId,
        })
        nudgeNotifications({ reason: 'reject', groupId: id, userId })
        return res
      } catch (err) {
        setMembers(snapshot)
        setActionError(err.message || 'Impossible de rejeter')
        throw err
      }
    },
    [id, members],
  )

  const remove = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = members
      setMembers((prev) => prev.filter((m) => String(m.user.id) !== String(userId)))
      try {
        const res = await apiRemoveMember(id, userId)
        invalidateMany([QueryKeys.groupMembers, QueryKeys.groups], {
          reason: 'remove',
          groupId: id,
          userId,
        })
        return res
      } catch (err) {
        setMembers(snapshot)
        setActionError(err.message || 'Impossible d’exclure')
        throw err
      }
    },
    [id, members],
  )

  const changeRole = useCallback(
    async (userId, role) => {
      setActionError(null)
      const snapshot = members
      setMembers((prev) =>
        prev.map((m) =>
          String(m.user.id) === String(userId) ? { ...m, role } : m,
        ),
      )
      try {
        const res = await apiChangeMemberRole(id, userId, role)
        invalidate(QueryKeys.groupMembers, { reason: 'changeRole', groupId: id, userId, role })
        return res
      } catch (err) {
        setMembers(snapshot)
        setActionError(err.message || 'Impossible de changer le rôle')
        throw err
      }
    },
    [id, members],
  )

  return {
    members,
    loading,
    error: error || actionError,
    actionError,
    approve,
    reject,
    remove,
    changeRole,
    reload: () => load({ silent: false }),
    silentReload,
  }
}
