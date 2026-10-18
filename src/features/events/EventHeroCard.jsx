import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconGlobe, IconMapPin, IconTrash, IconVideo } from '../../components/icons'
import { formatEventRange } from './eventUtils'
import { useEventCardCover } from './useEventCardCover'

/** Carte événement : couverture (photo ou aperçu vidéo) + clic → détail. */
export function EventHeroCard({ event, onDelete, showDelete = false }) {
  const { t, i18n } = useTranslation()
  const coverSrc = useEventCardCover(event)
  const upcoming = event.temporalStatus === 'upcoming'
  const isVideo = event.coverType === 'video'
  const locationLabel =
    event.locationType === 'in_person' ? t('events.location.inPerson') : t('events.location.online')
  const detailPath = `/events/${event.id}`

  return (
    <article className="bb-card group relative overflow-hidden">
      <Link
        to={detailPath}
        aria-label={`${t('events.open')} — ${event.title}`}
        className="relative block aspect-[16/10] overflow-hidden bg-bb-alt no-underline outline-none transition-opacity hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-bb-primary focus-visible:ring-inset"
        style={
          coverSrc
            ? {
                backgroundImage: `url(${coverSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div
          className={
            coverSrc
              ? 'absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 transition-opacity group-hover:from-black/95'
              : 'absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20'
          }
        />

        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={clsx(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                upcoming ? 'bg-white/90 text-bb-primary' : 'bg-black/50 text-white/90',
              )}
            >
              {upcoming ? t('events.status.upcoming') : t('events.status.past')}
            </span>
            <span
              title={locationLabel}
              aria-hidden="true"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            >
              {event.locationType === 'in_person' ? (
                <IconMapPin className="h-3.5 w-3.5" />
              ) : (
                <IconGlobe className="h-3.5 w-3.5" />
              )}
            </span>
            {isVideo ? (
              <span
                title={t('events.cover.video')}
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
              >
                <IconVideo className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-12">
          <h3 className="m-0 line-clamp-2 text-bb-base font-semibold text-white drop-shadow-sm">
            {event.title}
          </h3>
          <p className="m-0 mt-1 text-bb-xs text-white/85">
            {formatEventRange(event.startsAt, event.endsAt, i18n.language)}
          </p>
        </div>
      </Link>

      {showDelete && onDelete ? (
        <button
          type="button"
          title={t('events.delete')}
          aria-label={t('events.delete')}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
          className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-700 shadow-sm transition hover:bg-white"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      ) : null}
    </article>
  )
}
