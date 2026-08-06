import { useCallback, useEffect, useState } from 'react'
import { fetchPendingStories, moderateStory as apiModerate } from '../api/moderation'

/** Rôles autorisés à modérer (TDR §7.iii) */
export function canModerate(user) {
  if (!user) return false
  const role = user.role || user.roles?.[0]
  return (
    role === 'moderator' ||
    role === 'secretariat' ||
    role === 'yee' ||
    role === 'administrator'
  )
}

export function useModeration({ perPage = 10 } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchPendingStories({ perPage }))
    } catch (err) {
      setError(err.message || 'Failed to load moderation queue')
    } finally {
      setLoading(false)
    }
  }, [perPage])

  useEffect(() => {
    load()
  }, [load])

  const moderate = useCallback(
    async (id, { action, comment = '' }) => {
      setActingId(id)
      try {
        const updated = await apiModerate(id, { action, comment })
        setItems((prev) => prev.filter((a) => a.id !== id))
        return updated
      } finally {
        setActingId(null)
      }
    },
    [],
  )

  return {
    items,
    loading,
    error,
    actingId,
    moderate,
    reload: load,
    pendingCount: items.length,
  }
}
