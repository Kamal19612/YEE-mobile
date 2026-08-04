import { useCallback, useEffect, useState } from 'react'
import { fetchPendingStories, moderateStory as apiModerate } from '../api/moderation'
import { USE_MOCK } from '../config/api'
import { demoActivities, PUBLICATION_STATUS } from '../data/activityData'
import { useAuth } from './useAuth'

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
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 300))
        setItems(demoActivities.filter((a) => a.status === PUBLICATION_STATUS.PENDING))
      } else {
        setItems(await fetchPendingStories({ perPage }))
      }
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
        const nextStatus =
          action === 'approve' ? PUBLICATION_STATUS.PUBLISHED : PUBLICATION_STATUS.REJECTED

        if (USE_MOCK) {
          const idx = demoActivities.findIndex((a) => a.id === id)
          if (idx >= 0) {
            demoActivities[idx] = {
              ...demoActivities[idx],
              status: nextStatus,
              moderationComment: comment,
              moderatedAt: new Date().toISOString(),
              moderatedBy: user?.id,
            }
          }
          setItems((prev) => prev.filter((a) => a.id !== id))
          return demoActivities[idx]
        }

        const updated = await apiModerate(id, { action, comment })
        setItems((prev) => prev.filter((a) => a.id !== id))
        return updated
      } finally {
        setActingId(null)
      }
    },
    [user?.id],
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
