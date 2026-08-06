import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { events } from '../../data/integrationsData'

/** Référence: tribe-events/single-event.php */
export function EventPage() {
  const { eventId } = useParams()
  const event = events.find((e) => String(e.id) === String(eventId))

  if (!event) {
    return (
      <div className="bb-card p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">Event not found</h1>
        <Link to="/events" className="text-bb-primary hover:underline">
          Back to events
        </Link>
      </div>
    )
  }

  return (
    <article className="w-full max-w-content overflow-hidden rounded-bb border border-bb-border bg-bb-content">
      <img src={event.image} alt="" className="h-56 w-full object-cover" />
      <div className="p-5">
        <nav className="mb-2 text-bb-sm text-bb-muted">
          <Link to="/events" className="hover:text-bb-primary">
            Events
          </Link>
          <span className="mx-2">/</span>
          <span className="text-bb-heading">{event.title}</span>
        </nav>
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{event.title}</h1>
        <ul className="m-0 mt-4 list-none space-y-2 p-0 text-bb-sm text-bb-text">
          <li>
            <strong className="text-bb-heading">When:</strong>{' '}
            {new Date(event.start).toLocaleString()} – {new Date(event.end).toLocaleTimeString()}
          </li>
          <li>
            <strong className="text-bb-heading">Where:</strong> {event.venue}, {event.address}
          </li>
          <li>
            <strong className="text-bb-heading">Cost:</strong> {event.cost}
          </li>
        </ul>
        <p className="mt-4 text-bb-base text-bb-text">{event.description}</p>
        <Button type="button" size="sm" className="mt-4">
          RSVP (demo)
        </Button>
      </div>
    </article>
  )
}
