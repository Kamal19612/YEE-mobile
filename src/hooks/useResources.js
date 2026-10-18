import { useCallback, useEffect, useState } from 'react'
import {
  createCategory,
  createResource,
  deleteCategory,
  deleteResource,
  fetchCategories,
  fetchResource,
  fetchResources,
  updateCategory,
  updateResource,
} from '../api/resources'
import { invalidate, QueryKeys } from '../lib/queryEvents'
import { useBackgroundSync } from '../lib/useBackgroundSync'

/**
 * Liste des ressources filtrables.
 */
export function useResources({ category = '', language = '', search = '', enabled = true } = {}) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled) return
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const list = await fetchResources({ category, language, search })
        setResources(list)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setError(err)
        setResources([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [category, language, search, enabled],
  )

  useEffect(() => {
    void load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onResourcesSync = useCallback(
    (detail) => {
      if (detail?.reason === 'delete' && detail.resourceId) {
        setResources((prev) => prev.filter((r) => r.id !== String(detail.resourceId)))
        return
      }
      return silentReload()
    },
    [silentReload],
  )
  useBackgroundSync(QueryKeys.resources, onResourcesSync, { enabled })

  const add = useCallback(async (payload) => {
    setActionError(null)
    try {
      const created = await createResource(payload)
      setResources((prev) => [created, ...prev.filter((r) => r.id !== created.id)])
      invalidate(QueryKeys.resources, { reason: 'create', resourceId: created.id })
      return created
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const patch = useCallback(async (id, body) => {
    setActionError(null)
    try {
      const updated = await updateResource(id, body)
      setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      invalidate(QueryKeys.resources, { reason: 'patch', resourceId: updated.id })
      return updated
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const remove = useCallback(async (id) => {
    setActionError(null)
    try {
      await deleteResource(id)
      setResources((prev) => prev.filter((r) => r.id !== String(id)))
      invalidate(QueryKeys.resources, { reason: 'delete', resourceId: String(id) })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  return {
    resources,
    loading,
    error,
    actionError,
    reload: () => load({ silent: false }),
    add,
    patch,
    remove,
  }
}

/** Détail d’une ressource. */
export function useResource(id, { enabled = true } = {}) {
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled && id))
  const [error, setError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled || !id) {
        setResource(null)
        setLoading(false)
        return
      }
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await fetchResource(id)
        setResource(data)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setError(err)
        setResource(null)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, enabled],
  )

  useEffect(() => {
    void load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  useBackgroundSync(
    QueryKeys.resources,
    (detail) => {
      if (detail?.reason === 'delete' && String(detail.resourceId) === String(id)) {
        setResource(null)
        setError(new Error('not_found'))
        return
      }
      return silentReload()
    },
    { enabled: Boolean(enabled && id) },
  )

  return { resource, loading, error }
}

/** Catégories dynamiques + CRUD admin. */
export function useResourceCategories({ enabled = true } = {}) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled) return
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        setCategories(await fetchCategories())
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setError(err)
        setCategories([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [enabled],
  )

  useEffect(() => {
    void load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  useBackgroundSync(QueryKeys.resources, silentReload, { enabled })

  const add = useCallback(async ({ name }) => {
    setActionError(null)
    try {
      const created = await createCategory({ name })
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      )
      invalidate(QueryKeys.resources, { reason: 'categoryCreate', categoryId: created.id })
      return created
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const patch = useCallback(async (id, body) => {
    setActionError(null)
    try {
      const updated = await updateCategory(id, body)
      setCategories((prev) =>
        prev
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      )
      invalidate(QueryKeys.resources, { reason: 'categoryPatch', categoryId: updated.id })
      return updated
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const remove = useCallback(async (id) => {
    setActionError(null)
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== String(id)))
      invalidate(QueryKeys.resources, { reason: 'categoryDelete', categoryId: String(id) })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  return {
    categories,
    loading,
    error,
    actionError,
    reload: () => load({ silent: false }),
    add,
    patch,
    remove,
  }
}
