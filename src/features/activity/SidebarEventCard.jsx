import { Link } from 'react-router-dom'
import { IconVideo } from '../../components/icons'
import { useEventCardCover } from '../events/useEventCardCover'

/** Carte événement sidebar : couverture (photo ou aperçu vidéo) + texte sur dégradé. */
export function SidebarEventCard({ event, dateLabel }) {
  const coverSrc = useEventCardCover(event)
  const isVideo = event.coverType === 'video'

  return (
    <Link
      to={`/events/${event.id}`}
      className="relative block aspect-[16/10] overflow-hidden bg-bb-alt no-underline transition-opacity hover:opacity-95"
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
            ? 'absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10'
            : 'absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent'
        }
      />
      {isVideo ? (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
        >
          <IconVideo className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10">
        <span className="block truncate text-bb-sm font-semibold text-white drop-shadow-sm">
          {event.title}
        </span>
        {dateLabel ? (
          <span className="mt-0.5 block truncate text-bb-xs text-white/85">{dateLabel}</span>
        ) : null}
      </div>
    </Link>
  )
}
