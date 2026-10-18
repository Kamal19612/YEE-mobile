import { useTranslation } from 'react-i18next'
import { useFeed } from '../../hooks/useFeed'
import { Button } from '../../components/ui/Button'
import { FeedComposer } from '../activity/FeedComposer'
import { FeedNewActivityHandler } from '../activity/FeedNewActivityHandler'
import { FeedPostCard } from '../activity/FeedPostCard'
import { ActivityPlaceholder } from '../activity/ActivityPlaceholder'
import { scrollFeedToTop } from '../activity/scrollFeedToTop'

/** Timeline profil — même App API `/feed` filtrée par `authorId`. */
export function ProfileTimeline({ member, isOwn }) {
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
  } = useFeed({ perPage: 10, authorId: member?.id })

  const handleCreatePost = async (payload) => {
    const created = await createPost(payload)
    scrollFeedToTop()
    return created
  }

  return (
    <div id="profile-activity-stream">
      <FeedNewActivityHandler
        pendingNewCount={pendingNewCount}
        refreshingPending={refreshingPending}
        applyPendingRefresh={applyPendingRefresh}
        dismissPending={dismissPending}
        resetNewActivityBanner={resetNewActivityBanner}
      />
      {isOwn && <FeedComposer onSubmit={handleCreatePost} />}

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
        <div className="bb-card mb-5 p-8 text-center text-bb-sm text-bb-muted">
          {t('stories.empty')}
        </div>
      )}

      {!loading && (
        <ul className="activity-list bp-list m-0 list-none p-0">
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
  )
}
