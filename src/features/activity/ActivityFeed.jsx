import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivity } from '../../hooks/useActivity'
import { Button } from '../../components/ui/Button'
import { ActivityCard } from './ActivityCard'
import { ActivityComposer } from './ActivityComposer'
import { ActivityFilters } from './ActivityFilters'
import { ActivityPlaceholder } from './ActivityPlaceholder'
import { stripHtml } from './utils'

export function ActivityFeed() {
  const { t } = useTranslation()
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
  } = useActivity({ scope, perPage: 3 })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return activities
    return activities.filter((a) => {
      const hay = [
        a.title,
        stripHtml(a.content),
        a.userName,
        a.group?.name,
        a.tags?.country,
        a.tags?.thematic,
        a.tags?.language,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
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
              {t('stories.empty')}
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
                />
              ))}
            </ul>
          )}

          {!loading && hasMore && (
            <div className="load-more flex justify-center py-2">
              <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
