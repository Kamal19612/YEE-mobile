import { useMemo, useState } from 'react'
import { useActivity } from '../../hooks/useActivity'
import { Button } from '../../components/ui/Button'
import { ActivityCard } from './ActivityCard'
import { ActivityComposer } from './ActivityComposer'
import { ActivityFilters } from './ActivityFilters'
import { ActivityPlaceholder } from './ActivityPlaceholder'
import { stripHtml } from './utils'

export function ActivityFeed() {
  const [scope, setScope] = useState('all')
  const [search, setSearch] = useState('')
  const {
    activities,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    createPost,
    toggleFavorite,
    addComment,
    votePoll,
  } = useActivity({ scope, perPage: 2 })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return activities
    return activities.filter(
      (a) =>
        stripHtml(a.content).toLowerCase().includes(q) ||
        a.userName.toLowerCase().includes(q) ||
        a.group?.name?.toLowerCase().includes(q),
    )
  }, [activities, search])

  return (
    <div id="buddypress" className="buddypress-wrap w-full max-w-content">
      <ActivityComposer onSubmit={createPost} />

      <ActivityFilters
        scope={scope}
        onScopeChange={setScope}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="screen-content">
        <div id="activity-stream" className="activity" data-bp-list="activity">
          {loading && (
            <>
              <ActivityPlaceholder />
              <ActivityPlaceholder />
            </>
          )}

          {!loading && error && (
            <div className="bb-card mb-5 p-4 text-bb-sm text-bb-danger">{error}</div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div className="bb-card mb-5 p-8 text-center text-bb-sm text-bb-muted">
              Sorry, there was no activity found. Please try a different filter.
            </div>
          )}

          {!loading && (
            <ul className="activity-list bp-list item-list m-0 list-none p-0">
              {visible.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onLike={toggleFavorite}
                  onComment={addComment}
                  onVotePoll={votePoll}
                />
              ))}
            </ul>
          )}

          {!loading && hasMore && (
            <div className="load-more flex justify-center py-2">
              <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
