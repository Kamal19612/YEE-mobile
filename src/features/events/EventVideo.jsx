import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'

/** Lecteur YouTube intégré, ou lien externe pour LinkedIn / autres. */
export function EventVideo({ event, compact = false }) {
  const { t } = useTranslation()
  if (!event?.videoUrl) {
    return (
      <p className="m-0 text-bb-sm text-bb-muted">{t('events.noVideo')}</p>
    )
  }

  if ((event.videoProvider === 'youtube' || event.videoProvider === 'drive') && event.videoEmbedUrl) {
    return (
      <div className={compact ? 'aspect-video w-full overflow-hidden rounded-bb-inner bg-black' : 'aspect-video w-full overflow-hidden rounded-bb bg-black'}>
        <iframe
          title={event.title}
          src={event.videoEmbedUrl}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  const label =
    event.videoProvider === 'linkedin'
      ? t('events.openLinkedIn')
      : event.videoProvider === 'drive'
        ? t('events.openDrive')
        : t('events.openVideo')

  return (
    <div className="rounded-bb-inner border border-bb-border bg-bb-alt px-4 py-3">
      <p className="m-0 mb-2 text-bb-sm text-bb-text">
        {event.videoProvider === 'linkedin'
          ? t('events.linkedinHint')
          : event.videoProvider === 'drive'
            ? t('events.driveHint')
            : t('events.externalVideoHint')}
      </p>
      <Button
        as="a"
        href={event.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
      >
        {label}
      </Button>
    </div>
  )
}
