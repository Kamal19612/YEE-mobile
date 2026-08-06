import { useCallback, useEffect, useState } from 'react'
import {
  approveMember as apiApproveMember,
  changeMemberRole as apiChangeMemberRole,
  createGroup as apiCreateGroup,
  fetchGroup,
  fetchGroupMembers,
  fetchGroups,
  joinGroup as apiJoinGroup,
  leaveGroup as apiLeaveGroup,
  rejectMember as apiRejectMember,
  removeMember as apiRemoveMember,
  respondToInvitation as apiRespondToInvitation,
} from '../api/groups'

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGroups(await fetchGroups({ search, mine }))
    } catch (err) {
      setError(err.message || 'Impossible de charger les groupes')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [search, mine])

  useEffect(() => {
    load()
  }, [load])

  const createGroup = useCallback(async ({ name, description, visibility = 'public' }) => {
    setActionError(null)
    try {
      const created = await apiCreateGroup({ name, description, visibility })
      setGroups((prev) => [created, ...prev.filter((g) => String(g.id) !== String(created.id))])
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
      if (!target) return

      const snapshot = groups
      setGroups((prev) =>
        prev.map((g) =>
          String(g.id) === String(id)
            ? withViewerStatus(g, 'none', { deltaMembers: -1, nextRole: null })
            : g,
        ),
      )

      try {
        return await apiLeaveGroup(id)
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
        return await apiRespondToInvitation(id, accept)
      } catch (err) {
        setGroups(snapshot)
        setActionError(err.message || 'Impossible de répondre à l’invitation')
        throw err
      }
    },
    [groups],
  )

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
    reload: load,
  }
}

/** Détail d’un groupe — GET /groups/{id} */
export function useGroup(id) {
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (id == null || id === '') {
      setGroup(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setGroup(await fetchGroup(id))
    } catch (err) {
      setGroup(null)
      setError(err.message || 'Groupe introuvable')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { group, setGroup, loading, error, reload: load }
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
      return res
    } catch (err) {
      setGroup(snapshot)
      setActionError(err.message || 'Impossible de rejoindre le groupe')
      throw err
    }
  }, [id, group, setGroup])

  const leave = useCallback(async () => {
    setActionError(null)
    if (!group || !setGroup) return

    const snapshot = group
    setGroup(withViewerStatus(group, 'none', { deltaMembers: -1, nextRole: null }))

    try {
      return await apiLeaveGroup(id)
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
        return await apiRespondToInvitation(id, accept)
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

  const load = useCallback(async () => {
    if (id == null || id === '') {
      setMembers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setMembers(await fetchGroupMembers(id, { status }))
    } catch (err) {
      setMembers([])
      setError(err.message || 'Impossible de charger les membres')
    } finally {
      setLoading(false)
    }
  }, [id, status])

  useEffect(() => {
    load()
  }, [load])

  const approve = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = members
      setMembers((prev) => prev.filter((m) => String(m.user.id) !== String(userId)))
      try {
        return await apiApproveMember(id, userId)
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
        return await apiRejectMember(id, userId)
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
        return await apiRemoveMember(id, userId)
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
        return await apiChangeMemberRole(id, userId, role)
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
    reload: load,
  }
}
