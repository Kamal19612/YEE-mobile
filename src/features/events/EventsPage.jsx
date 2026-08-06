import { Link } from 'react-router-dom'
import { events } from '../../data/integrationsData'

/** Référence: tribe-events/list/single-event.php */
export function EventsPage() {
  return (
    <div className="w-full max-w-content">
      <header className="mb-5">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Events</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">Upcoming community events.</p>
      </header>

      <ul className="m-0 list-none space-y-3 p-0">
        {events.map((event) => {
          const start = new Date(event.start)
          return (
            <li key={event.id} className="bb-card overflow-hidden">
              <div className="flex flex-col bb:flex-row">
                <Link to={`/events/${event.id}`} className="bb:w-48 bb:shrink-0">
                  <img src={event.image} alt="" className="h-40 w-full object-cover bb:h-full" />
                </Link>
                <div className="flex flex-1 gap-4 p-4">
                  <div className="bs-schedule-short-date flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-bb-inner bg-bb-alt text-center">
                    <span className="text-[10px] font-semibold uppercase text-bb-muted">
                      {start.toLocaleString('en', { month: 'short' })}
                    </span>
                    <span className="text-bb-lg font-semibold leading-none text-bb-heading">
                      {start.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/events/${event.id}`}
                      className="text-bb-md font-semibold text-bb-heading hover:text-bb-primary"
                    >
                      {event.title}
                    </Link>
                    <div className="mt-1 text-bb-sm text-bb-muted">
                      {start.toLocaleString()} · {event.venue}
                    </div>
                    <p className="m-0 mt-2 text-bb-sm text-bb-text">{event.excerpt}</p>
                    <div className="mt-2 text-bb-xs font-medium text-bb-primary">{event.cost}</div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
