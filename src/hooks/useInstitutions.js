import { useCallback, useEffect, useState } from 'react'
import {
  addReferent as apiAddReferent,
  approveAffiliation as apiApproveAffiliation,
  cancelAffiliation as apiCancelAffiliation,
  createInstitution as apiCreateInstitution,
  deleteInstitution as apiDeleteInstitution,
  fetchAffiliations,
  enrichAffiliationMedia,
  fetchInstitution,
  fetchInstitutions,
  rejectAffiliation as apiRejectAffiliation,
  removeMember as apiRemoveMember,
  removeReferent as apiRemoveReferent,
  requestAffiliation as apiRequestAffiliation,
  updateInstitution as apiUpdateInstitution,
  withInferredReferents,
} from '../api/institutions'

function withAffiliationStatus(institution, nextStatus, { deltaMembers = 0 } = {}) {
  if (!institution) return institution
  return {
    ...institution,
    viewerAffiliationStatus: nextStatus,
    membersCount: Math.max(0, (institution.membersCount || 0) + deltaMembers),
  }
}

/**
 * Un niveau du sélecteur en cascade — charge à la demande.
 * parentId null/undefined + pas de type → continents (GET /institutions).
 */
export function useInstitutionTree(parentId, type) {
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    // Pays / clubs : attendre le parent avant d’appeler
    if (type && (parentId == null || parentId === '')) {
      setInstitutions([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const opts = {}
      if (parentId != null && parentId !== '') opts.parentId = parentId
      if (type) opts.type = type
      setInstitutions(await fetchInstitutions(opts))
    } catch (err) {
      setInstitutions([])
      setError(err.message || 'Impossible de charger les institutions')
    } finally {
      setLoading(false)
    }
  }, [parentId, type])

  useEffect(() => {
    load()
  }, [load])

  return { institutions, loading, error, reload: load }
}

/** Détail d’une institution — GET /institutions/{id} */
export function useInstitution(id) {
  const [institution, setInstitution] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (id == null || id === '') {
      setInstitution(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setInstitution(await fetchInstitution(id))
    } catch (err) {
      setInstitution(null)
      setError(err.message || 'Institution introuvable')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  return { institution, setInstitution, loading, error, reload: load }
}

/**
 * Demande / annulation d’affiliation — mise à jour optimiste de viewerAffiliationStatus.
 */
export function useInstitutionAffiliation(id, { institution, setInstitution } = {}) {
  const [actionError, setActionError] = useState(null)

  const request = useCallback(async () => {
    setActionError(null)
    if (!institution || !setInstitution) {
      try {
        return await apiRequestAffiliation(id)
      } catch (err) {
        setActionError(err.message || 'Impossible de demander l’affiliation')
        throw err
      }
    }

    const snapshot = institution
    setInstitution(withAffiliationStatus(institution, 'pending'))

    try {
      const res = await apiRequestAffiliation(id)
      const status = res?.status || 'pending'
      setInstitution(withAffiliationStatus(snapshot, status))
      return res
    } catch (err) {
      setInstitution(snapshot)
      setActionError(err.message || 'Impossible de demander l’affiliation')
      throw err
    }
  }, [id, institution, setInstitution])

  const cancel = useCallback(async () => {
    setActionError(null)
    if (!institution || !setInstitution) {
      try {
        return await apiCancelAffiliation(id)
      } catch (err) {
        setActionError(err.message || 'Impossible d’annuler l’affiliation')
        throw err
      }
    }

    const snapshot = institution
    const wasActive = institution.viewerAffiliationStatus === 'active'
    setInstitution(
      withAffiliationStatus(institution, 'none', { deltaMembers: wasActive ? -1 : 0 }),
    )

    try {
      const res = await apiCancelAffiliation(id)
      const status = res?.status || 'none'
      setInstitution(
        withAffiliationStatus(snapshot, status, {
          deltaMembers: wasActive && status === 'none' ? -1 : 0,
        }),
      )
      return res
    } catch (err) {
      setInstitution(snapshot)
      setActionError(err.message || 'Impossible d’annuler l’affiliation')
      throw err
    }
  }, [id, institution, setInstitution])

  return {
    request,
    cancel,
    actionError,
    clearActionError: () => setActionError(null),
  }
}

/**
 * Liste des affiliations (panneau référent) + approve / reject.
 * @param {string} id
 * @param {string} [status='pending']
 */
export function useInstitutionAffiliations(id, status = 'pending') {
  const [affiliations, setAffiliations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async () => {
    if (id == null || id === '') {
      setAffiliations([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchAffiliations(id, { status })
      const initial = status === 'active' ? withInferredReferents(list) : list
      setAffiliations(initial)
      setLoading(false)

      if (status === 'active' && initial.length > 0) {
        const enriched = withInferredReferents(await enrichAffiliationMedia(initial))
        setAffiliations(enriched)
      }
    } catch (err) {
      setAffiliations([])
      setError(err.message || 'Impossible de charger les affiliations')
      setLoading(false)
    }
  }, [id, status])

  useEffect(() => {
    load()
  }, [load])

  const approve = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = affiliations
      setAffiliations((prev) => prev.filter((a) => String(a.user.id) !== String(userId)))
      try {
        return await apiApproveAffiliation(id, userId)
      } catch (err) {
        setAffiliations(snapshot)
        setActionError(err.message || 'Impossible d’approuver')
        throw err
      }
    },
    [id, affiliations],
  )

  const reject = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = affiliations
      setAffiliations((prev) => prev.filter((a) => String(a.user.id) !== String(userId)))
      try {
        return await apiRejectAffiliation(id, userId)
      } catch (err) {
        setAffiliations(snapshot)
        setActionError(err.message || 'Impossible de rejeter')
        throw err
      }
    },
    [id, affiliations],
  )

  const addReferent = useCallback(
    async (userId) => {
      setActionError(null)
      try {
        return await apiAddReferent(id, userId)
      } catch (err) {
        setActionError(err.message || 'Impossible de nommer le référent')
        throw err
      }
    },
    [id],
  )

  const removeReferent = useCallback(
    async (userId) => {
      setActionError(null)
      try {
        return await apiRemoveReferent(id, userId)
      } catch (err) {
        setActionError(err.message || 'Impossible de retirer le référent')
        throw err
      }
    },
    [id],
  )

  const removeMember = useCallback(
    async (userId) => {
      setActionError(null)
      const snapshot = affiliations
      setAffiliations((prev) => prev.filter((a) => String(a.user.id) !== String(userId)))
      try {
        return await apiRemoveMember(id, userId)
      } catch (err) {
        setAffiliations(snapshot)
        setActionError(err.message || 'Impossible de retirer le membre')
        throw err
      }
    },
    [id, affiliations],
  )

  return {
    affiliations,
    loading,
    error: error || actionError,
    actionError,
    approve,
    reject,
    addReferent,
    removeReferent,
    removeMember,
    reload: load,
  }
}

/**
 * Affiliations actives d’un utilisateur — GET /institutions?userId=
 * Sert aussi à détecter si le viewer est référent d’au moins une institution.
 */
export function useMyInstitutions(userId) {
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (userId == null || userId === '') {
      setInstitutions([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setInstitutions(await fetchInstitutions({ userId }))
    } catch (err) {
      setInstitutions([])
      setError(err.message || 'Impossible de charger les institutions')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const isReferentSomewhere = institutions.some((i) => i.viewerIsReferent)

  return {
    institutions,
    loading,
    error,
    isReferentSomewhere,
    reload: load,
  }
}

/**
 * Tous les clubs locaux — GET /institutions?type=local&search=
 * CRUD create / update / delete avec mise à jour locale de la liste.
 */
export function useClubs({ search = '' } = {}) {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setClubs(await fetchInstitutions({ type: 'local', search }))
    } catch (err) {
      setClubs([])
      setError(err.message || 'Impossible de charger les clubs')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const createClub = useCallback(async ({ name, parentId, description, countryName, continentName }) => {
    setActionError(null)
    const created = await apiCreateInstitution({
      name,
      type: 'local',
      parentId,
      description,
    })
    const club = {
      ...created,
      countryName: created.countryName ?? countryName ?? null,
      continentName: created.continentName ?? continentName ?? null,
    }
    setClubs((prev) => [club, ...prev.filter((c) => c.id !== club.id)])
    return club
  }, [])

  const updateClub = useCallback(
    async (id, { name, description }) => {
      setActionError(null)
      const snapshot = clubs
      setClubs((prev) =>
        prev.map((c) =>
          String(c.id) === String(id)
            ? {
                ...c,
                ...(name != null ? { name } : {}),
                ...(description != null ? { description } : {}),
              }
            : c,
        ),
      )
      try {
        const updated = await apiUpdateInstitution(id, { name, description })
        setClubs((prev) =>
          prev.map((c) =>
            String(c.id) === String(id)
              ? {
                  ...c,
                  ...updated,
                  countryName: updated.countryName ?? c.countryName,
                  continentName: updated.continentName ?? c.continentName,
                }
              : c,
          ),
        )
        return updated
      } catch (err) {
        setClubs(snapshot)
        setActionError(err.message || 'Impossible de modifier le club')
        throw err
      }
    },
    [clubs],
  )

  const deleteClub = useCallback(
    async (id) => {
      setActionError(null)
      const snapshot = clubs
      setClubs((prev) => prev.filter((c) => String(c.id) !== String(id)))
      try {
        return await apiDeleteInstitution(id)
      } catch (err) {
        setClubs(snapshot)
        setActionError(err.message || 'Impossible de supprimer le club')
        throw err
      }
    },
    [clubs],
  )

  return {
    clubs,
    loading,
    error,
    actionError,
    createClub,
    updateClub,
    deleteClub,
    reload: load,
    clearActionError: () => setActionError(null),
  }
}

/** Pays où le viewer est référent — GET /institutions?type=country&referentOnly=1 */
export function useReferentCountries(enabled = true) {
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!enabled) {
      setCountries([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setCountries(await fetchInstitutions({ type: 'country', referentOnly: true }))
    } catch (err) {
      setCountries([])
      setError(err.message || 'Impossible de charger les pays référents')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    load()
  }, [load])

  return { countries, loading, error, reload: load }
}

/** Tous les pays — GET /institutions?type=country */
export function useCountries() {
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCountries(await fetchInstitutions({ type: 'country' }))
    } catch (err) {
      setCountries([])
      setError(err.message || 'Impossible de charger les pays')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { countries, loading, error, reload: load }
}
