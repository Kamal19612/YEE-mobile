import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchEventCoverBlob } from '../../api/events'
import { EventVideo } from './EventVideo'

/** Couverture photo (blob auth) ou vidéo URL. */
export function EventCover({ event, compact = false }) {
  const { t } = useTranslation()
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (event?.coverType !== 'photo' || !event?.id) {
      setSrc(null)
      setFailed(false)
      return undefined
    }
    let cancelled = false
    setFailed(false)
    setSrc(null)
    fetchEventCoverBlob(event.id)
      .then((entry) => {
        if (cancelled) return
        // getCachedBlob renvoie { objectUrl, blob } — pas un Blob brut
        setSrc(entry?.objectUrl || null)
        if (!entry?.objectUrl) setFailed(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      // objectUrl géré par le cache partagé — ne pas revoke ici
    }
  }, [event?.id, event?.coverType])

  if (event?.coverType === 'video' && event?.videoUrl) {
    return <EventVideo event={event} compact={compact} />
  }

  if (event?.coverType === 'photo') {
    if (failed) {
      return <p className="m-0 text-bb-sm text-bb-muted">{t('events.coverUnavailable')}</p>
    }
    if (!src) {
      return (
        <div
          className={
            compact
              ? 'aspect-video w-full animate-pulse rounded-bb-inner bg-bb-alt'
              : 'aspect-video w-full animate-pulse rounded-bb bg-bb-alt'
          }
        />
      )
    }
    return (
      <div
        className={
          compact
            ? 'aspect-video w-full overflow-hidden rounded-bb-inner bg-bb-alt'
            : 'aspect-video w-full overflow-hidden rounded-bb bg-bb-alt'
        }
      >
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return null
}
