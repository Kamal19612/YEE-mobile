import { useTranslation } from 'react-i18next'
import { useFeed } from '../../hooks/useFeed'
import { Button } from '../../components/ui/Button'
import { FeedComposer } from './FeedComposer'
import { FeedPostCard } from './FeedPostCard'
import { ActivityPlaceholder } from './ActivityPlaceholder'

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
  } = useFeed({ perPage: 10 })

  return (
    <div id="buddypress" className="buddypress-wrap w-full max-w-content">
      <FeedComposer onSubmit={createPost} />

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
            <div className="bb-card mb-5 p-8 text-center text-bb-sm text-bb-muted">
              {t('stories.empty')}
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
