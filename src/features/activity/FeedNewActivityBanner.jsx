import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { IconClose } from '../../components/icons'
import { useLayout } from '../../context/LayoutProvider'

/**
 * Barre fixe sous le header : visible pendant tout le scroll du fil
 * jusqu’à actualiser ou ignorer.
 */
export function FeedNewActivityBanner({
  count = 0,
  refreshing = false,
  onRefresh,
  onDismiss,
}) {
  const { t } = useTranslation()
  const { panelOpen } = useLayout()

  if (!count || count < 1) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-testid="feed-refresh-banner-root"
      className={clsx(
        'pointer-events-none fixed inset-x-0 z-[600] px-3 bb:px-4',
        'top-[calc(var(--bb-header-height)+0.5rem)]',
        'bb:left-[var(--bb-panel-width)]',
        panelOpen && 'bb:left-[var(--bb-panel-width-open)]',
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-content items-stretch overflow-hidden rounded-bb border border-bb-primary/40 bg-bb-primary text-white shadow-card motion-safe:animate-feedNewPulse">
        <button
          type="button"
          data-testid="feed-refresh-banner"
          onClick={() => onRefresh?.()}
          disabled={refreshing}
          className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-3 text-bb-sm font-semibold transition-[opacity] duration-200 ease-bb hover:bg-white/10 disabled:cursor-wait disabled:opacity-80"
        >
          <span className="inline-block h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-white/95" aria-hidden />
          <span className="truncate motion-safe:animate-pulse">
            {refreshing
              ? t('common.loading')
              : count === 1
                ? t('stories.feed.newActivity_one')
                : t('stories.feed.newActivity_other', { count })}
          </span>
        </button>
        <button
          type="button"
          data-testid="feed-refresh-dismiss"
          onClick={() => onDismiss?.()}
          disabled={refreshing}
          title={t('stories.feed.dismissNewActivity')}
          aria-label={t('stories.feed.dismissNewActivity')}
          className="inline-flex shrink-0 items-center justify-center border-l border-white/20 px-3 text-white/90 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-80"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
