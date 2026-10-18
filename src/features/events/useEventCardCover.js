import { useEffect, useState } from 'react'
import { fetchEventCoverBlob } from '../../api/events'
import { getEventVideoThumbnailUrl } from './eventUtils'

/** Charge la couverture photo (blob) ou la miniature vidéo pour les cards. */
export function useEventCardCover(event) {
  const [coverSrc, setCoverSrc] = useState(null)

  useEffect(() => {
    if (!event?.id) {
      setCoverSrc(null)
      return undefined
    }

    if (event.coverType === 'video') {
      setCoverSrc(getEventVideoThumbnailUrl(event))
      return undefined
    }

    if (event.coverType !== 'photo') {
      setCoverSrc(null)
      return undefined
    }

    let cancelled = false
    setCoverSrc(null)
    fetchEventCoverBlob(event.id)
      .then((entry) => {
        if (!cancelled) setCoverSrc(entry?.objectUrl || null)
      })
      .catch(() => {
        if (!cancelled) setCoverSrc(null)
      })
    return () => {
      cancelled = true
    }
  }, [event?.id, event?.coverType, event?.videoProvider, event?.videoExternalId])

  return coverSrc
}
