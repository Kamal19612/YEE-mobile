import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { canModerate, useModeration } from '../../hooks/useModeration'
import { ModerationCard } from './ModerationCard'

/** File de modération pré-publication — TDR §1.2, §8, §7.iii */
export function ModerationPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const allowed = canModerate(user)
  const { items, loading, error, actingId, moderate, reload, pendingCount } = useModeration()

  if (!allowed) {
    return (
      <div className="w-full max-w-content">
        <div className="rounded-bb border border-bb-border bg-bb-content p-8 text-center">
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('moderation.title')}</h1>
          <p className="mt-3 mb-0 text-bb-base text-bb-muted">{t('moderation.forbidden')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-content">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('moderation.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">
            {t('moderation.subtitle', { count: pendingCount })}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={reload}>
          {t('moderation.refresh')}
        </Button>
      </header>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bb-card mb-4 p-4 text-bb-sm text-bb-danger">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
          {t('moderation.empty')}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {items.map((story) => (
            <ModerationCard
              key={story.id}
              story={story}
              acting={actingId === story.id}
              onApprove={(id) => moderate(id, { action: 'approve' })}
              onReject={(id, comment) => moderate(id, { action: 'reject', comment })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
