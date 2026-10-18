import { useCallback, useEffect, useState } from 'react'
import {
  createEvent,
  createEventCategory,
  deleteEvent,
  deleteEventCategory,
  fetchEvent,
  fetchEventCategories,
  fetchEvents,
  updateEvent,
  updateEventCategory,
} from '../api/events'
import { invalidate, QueryKeys } from '../lib/queryEvents'
import { useBackgroundSync } from '../lib/useBackgroundSync'

export function useEvents({ category = '', status = '', search = '', enabled = true } = {}) {
  const [events, setEvents] = useState([])
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
        const list = await fetchEvents({ category, status, search })
        setEvents(list)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setError(err)
        setEvents([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [category, status, search, enabled],
  )

  useEffect(() => {
    void load()
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  const onEventsSync = useCallback(
    (detail) => {
      if (detail?.reason === 'delete' && detail.eventId) {
        setEvents((prev) => prev.filter((e) => e.id !== String(detail.eventId)))
        return
      }
      return silentReload()
    },
    [silentReload],
  )
  useBackgroundSync(QueryKeys.events, onEventsSync, { enabled })

  const add = useCallback(async (payload) => {
    setActionError(null)
    try {
      const created = await createEvent(payload)
      setEvents((prev) => [created, ...prev.filter((e) => e.id !== created.id)])
      invalidate(QueryKeys.events, { reason: 'create', eventId: created.id })
      return created
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const patch = useCallback(async (id, body) => {
    setActionError(null)
    try {
      const updated = await updateEvent(id, body)
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      invalidate(QueryKeys.events, { reason: 'patch', eventId: updated.id })
      return updated
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const remove = useCallback(async (id) => {
    setActionError(null)
    try {
      await deleteEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== String(id)))
      invalidate(QueryKeys.events, { reason: 'delete', eventId: String(id) })
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  return { events, loading, error, actionError, reload: () => load({ silent: false }), add, patch, remove }
}

export function useEvent(id, { enabled = true } = {}) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled && id))
  const [error, setError] = useState(null)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled || !id) {
        setEvent(null)
        setLoading(false)
        return
      }
      if (!silent) {
        setLoading(true)
        setError(null)
      }
      try {
        const data = await fetchEvent(id)
        setEvent(data)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setError(err)
        setEvent(null)
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
    QueryKeys.events,
    (detail) => {
      if (detail?.reason === 'delete' && String(detail.eventId) === String(id)) {
        setEvent(null)
        setError(new Error('not_found'))
        return
      }
      return silentReload()
    },
    { enabled: Boolean(enabled && id) },
  )

  return { event, loading, error }
}

export function useEventCategories({ enabled = true } = {}) {
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
        setCategories(await fetchEventCategories())
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
  useBackgroundSync(QueryKeys.events, silentReload, { enabled })

  const add = useCallback(async (payload) => {
    setActionError(null)
    try {
      const created = await createEventCategory(payload)
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      )
      invalidate(QueryKeys.events, { reason: 'categoryCreate', categoryId: created.id })
      return created
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const patch = useCallback(async (id, body) => {
    setActionError(null)
    try {
      const updated = await updateEventCategory(id, body)
      setCategories((prev) =>
        prev
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      )
      invalidate(QueryKeys.events, { reason: 'categoryPatch', categoryId: updated.id })
      return updated
    } catch (err) {
      setActionError(err)
      throw err
    }
  }, [])

  const remove = useCallback(async (id) => {
    setActionError(null)
    try {
      await deleteEventCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== String(id)))
      invalidate(QueryKeys.events, { reason: 'categoryDelete', categoryId: String(id) })
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
