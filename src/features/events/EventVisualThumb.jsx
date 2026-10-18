import { useEffect, useState } from 'react'
import { fetchEventVisualBlob } from '../../api/events'

/** Miniature galerie (blob authentifié). */
export function EventVisualThumb({ eventId, visual, className = '' }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    if (!eventId || !visual?.id) return undefined
    let cancelled = false
    fetchEventVisualBlob(eventId, visual.id)
      .then((entry) => {
        if (cancelled) return
        setSrc(entry?.objectUrl || null)
      })
      .catch(() => {
        if (!cancelled) setSrc(null)
      })
    return () => {
      cancelled = true
      // objectUrl géré par le cache partagé — ne pas revoke ici
    }
  }, [eventId, visual?.id])

  if (!src) {
    return <div className={`animate-pulse bg-bb-alt ${className}`} />
  }
  return (
    <img
      src={src}
      alt={visual.originalFilename || ''}
      className={`object-cover ${className}`}
      onError={() => setSrc(null)}
    />
  )
}
