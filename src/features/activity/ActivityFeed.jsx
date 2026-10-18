import { useTranslation } from 'react-i18next'
import { useFeed } from '../../hooks/useFeed'
import { Button } from '../../components/ui/Button'
import { FeedComposer } from './FeedComposer'
import { FeedNewActivityHandler } from './FeedNewActivityHandler'
import { FeedPostCard } from './FeedPostCard'
import { ActivityPlaceholder } from './ActivityPlaceholder'
import { scrollFeedToTop } from './scrollFeedToTop'

/** Fil d’actualité — App API `/feed` (Sprint 3). */
export function ActivityFeed() {
  const { t } = useTranslation()
  const {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    createPost,
    toggleLike,
    deletePost,
    loadComments,
    addComment,
    removeComment,
    pendingNewCount,
    refreshingPending,
    applyPendingRefresh,
    dismissPending,
    resetNewActivityBanner,
  } = useFeed({ perPage: 10 })

  const handleCreatePost = async (payload) => {
    const created = await createPost(payload)
    scrollFeedToTop()
    return created
  }

  return (
    <div id="buddypress" className="buddypress-wrap w-full max-w-content">
      <FeedNewActivityHandler
        pendingNewCount={pendingNewCount}
        refreshingPending={refreshingPending}
        applyPendingRefresh={applyPendingRefresh}
        dismissPending={dismissPending}
        resetNewActivityBanner={resetNewActivityBanner}
      />
      <FeedComposer onSubmit={handleCreatePost} />

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

          {!loading && !error && posts.length === 0 && (
            <div className="bb-card mb-5 px-6 py-12 text-center">
              <p className="font-display m-0 text-bb-lg font-semibold text-bb-heading">
                {t('stories.empty')}
              </p>
            </div>
          )}

          {!loading && (
            <ul className="activity-list bp-list item-list m-0 list-none p-0">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  onLike={toggleLike}
                  onDelete={deletePost}
                  onLoadComments={loadComments}
                  onAddComment={addComment}
                  onDeleteComment={removeComment}
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
