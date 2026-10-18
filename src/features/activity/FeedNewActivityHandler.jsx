import { useEffect } from 'react'
import { FeedNewActivityBanner } from './FeedNewActivityBanner'
import { scrollFeedToTop } from './scrollFeedToTop'
import { useFeedScrollAtTop } from '../../hooks/useFeedScrollAtTop'

/**
 * Bandeau « nouvelles publications » : visible seulement si l’utilisateur
 * a scrollé plus bas que le haut du fil. Clic → recharge + remonte en haut.
 */
export function FeedNewActivityHandler({
  pendingNewCount,
  refreshingPending,
  applyPendingRefresh,
  dismissPending,
  resetNewActivityBanner,
}) {
  const atTop = useFeedScrollAtTop()

  useEffect(() => {
    if (atTop && pendingNewCount > 0) {
      resetNewActivityBanner?.()
    }
  }, [atTop, pendingNewCount, resetNewActivityBanner])

  const showBanner = pendingNewCount > 0 && !atTop

  const handleRefresh = async () => {
    await applyPendingRefresh?.()
    scrollFeedToTop()
  }

  if (!showBanner) return null

  return (
    <FeedNewActivityBanner
      count={pendingNewCount}
      refreshing={refreshingPending}
      onRefresh={handleRefresh}
      onDismiss={dismissPending}
    />
  )
}
