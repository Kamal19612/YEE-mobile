import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fetchCommunitySummary } from '../../api/users'
import { useEvents } from '../../hooks/useEvents'
import { QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'
import { ActivityFeed } from './ActivityFeed'
import { SidebarEventCard } from './SidebarEventCard'

const UPCOMING_EVENTS_LIMIT = 5

function formatSidebarEventDate(iso, locale) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(locale || 'fr', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

/** Page fil d’actualités — buddypress/activity/index.php adapté AfrEA-YEE */
export function ActivityPage() {
  const { t, i18n } = useTranslation()
  const [summary, setSummary] = useState(null)
  const { events: upcomingEvents, loading: eventsLoading } = useEvents({ status: 'upcoming' })

  const sidebarEvents = useMemo(
    () =>
      [...upcomingEvents]
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
        .slice(0, UPCOMING_EVENTS_LIMIT),
    [upcomingEvents],
  )

  useEffect(() => {
    let alive = true
    fetchCommunitySummary()
      .then((data) => {
        if (alive) setSummary(data)
      })
      .catch(() => {
        if (alive) setSummary({ members: 0, groups: 0 })
      })
    return () => {
      alive = false
    }
  }, [])

  useBackgroundSync([QueryKeys.members, QueryKeys.groups], () => {
    fetchCommunitySummary()
      .then((data) => setSummary(data))
      .catch(() => {})
  })

  const formatCount = (value) =>
    value == null ? '—' : Number(value).toLocaleString(i18n.language)

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
      <main id="primary" className="content-area order-2 min-w-0 flex-1 lg:order-1">
        <ActivityFeed />
      </main>

      <aside className="widget-area order-1 w-full shrink-0 space-y-4 lg:order-2 lg:w-[240px] xl:w-[280px]">
        <section className="bb-card overflow-hidden p-0">
          <div className="border-b border-bb-border bg-gradient-to-br from-[#eef2ff] to-[#faf6eb] px-4 py-3">
            <h3 className="font-display m-0 text-bb-sm font-semibold tracking-wide text-bb-heading">
              {t('stories.sidebar.community')}
            </h3>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 text-bb-sm text-bb-text lg:grid-cols-1">
            <li className="flex items-center justify-between gap-2 border-r border-bb-border px-3 py-3 lg:border-r-0 lg:px-4 lg:py-2.5">
              <span className="min-w-0 truncate">{t('stories.sidebar.members')}</span>
              <strong className="font-display shrink-0 text-bb-lg text-bb-heading">
                {formatCount(summary?.members)}
              </strong>
            </li>
            <li className="flex items-center justify-between gap-2 px-3 py-3 lg:border-t lg:border-bb-border lg:px-4 lg:py-2.5">
              <span className="min-w-0 truncate">{t('stories.sidebar.cohorts')}</span>
              <strong className="font-display shrink-0 text-bb-lg text-bb-heading">
                {formatCount(summary?.groups)}
              </strong>
            </li>
          </ul>
        </section>
        <section className="bb-card hidden overflow-hidden p-0 lg:block">
          <div className="border-b border-bb-border px-4 py-3">
            <h3 className="font-display m-0 text-bb-sm font-semibold tracking-wide text-bb-heading">
              {t('stories.sidebar.upcomingEvents')}
            </h3>
          </div>
          {eventsLoading ? (
            <p className="m-0 px-4 py-3 text-bb-sm text-bb-muted">{t('common.loading')}</p>
          ) : sidebarEvents.length === 0 ? (
            <p className="m-0 px-4 py-3 text-bb-sm text-bb-muted">
              {t('stories.sidebar.upcomingEventsEmpty')}
            </p>
          ) : (
            <ul className="m-0 list-none space-y-0 p-0">
              {sidebarEvents.map((event) => (
                <li key={event.id} className="border-b border-bb-border last:border-b-0">
                  <SidebarEventCard
                    event={event}
                    dateLabel={formatSidebarEventDate(event.startsAt, i18n.language)}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-bb-border px-4 py-2.5">
            <Link
              to="/events"
              className="text-bb-xs font-medium text-bb-primary no-underline hover:underline"
            >
              {t('stories.sidebar.upcomingEventsAll')}
            </Link>
          </div>
        </section>
      </aside>
    </div>
  )
}
