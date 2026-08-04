import { useCallback, useEffect, useState } from 'react'

const QUEUE_KEY = 'afrea-offline-queue'

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

/**
 * Mode hors-ligne / sync différée (TDR §1.2)
 * File d’attente locale pour publications quand la connectivité revient.
 */
export function useOffline() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [queue, setQueue] = useState(() => readQueue())

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const enqueue = useCallback((item) => {
    setQueue((prev) => {
      const next = [...prev, { ...item, id: `q-${Date.now()}`, queuedAt: new Date().toISOString() }]
      writeQueue(next)
      return next
    })
  }, [])

  const dequeue = useCallback((id) => {
    setQueue((prev) => {
      const next = prev.filter((i) => i.id !== id)
      writeQueue(next)
      return next
    })
  }, [])

  const flush = useCallback(
    async (handler) => {
      if (!online || !queue.length || !handler) return []
      const results = []
      for (const item of [...queue]) {
        try {
          await handler(item)
          results.push({ id: item.id, ok: true })
          dequeue(item.id)
        } catch (err) {
          results.push({ id: item.id, ok: false, error: err.message })
          break
        }
      }
      return results
    },
    [online, queue, dequeue],
  )

  return { online, queue, queueCount: queue.length, enqueue, dequeue, flush }
}
