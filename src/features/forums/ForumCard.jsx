import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatTimeSince } from '../activity/utils'

/** Référence: bbpress/loop-forum-card.php */
export function ForumCard({ forum }) {
  const { t } = useTranslation()

  return (
    <li className="list-none">
      <div className="bb-cover-list-item overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-card">
        <Link
          to={`/forums/${forum.id}`}
          className="bb-cover-wrap block h-32 bg-cover bg-center"
          style={
            forum.cover
              ? { backgroundImage: `url(${forum.cover})` }
              : { backgroundColor: 'var(--bb-cover-image-background-color)' }
          }
          title={forum.title}
        />
        <div className="bs-card-forum-details p-4">
          <div className="bs-sec-header mb-2">
            <h3 className="m-0 text-bb-md font-semibold">
              <Link to={`/forums/${forum.id}`} className="bbp-forum-title text-bb-heading hover:text-bb-primary">
                {forum.title}
              </Link>
            </h3>
          </div>
          <div className="bb-forum-content mb-3 text-bb-sm text-bb-text line-clamp-2">
            {forum.description}
          </div>
          <div className="forums-meta bb-forums-meta flex flex-wrap gap-3 text-bb-xs text-bb-muted">
            <span>
              {t(
                forum.topicCount === 1 ? 'forums.discussions_one' : 'forums.discussions_other',
                { count: forum.topicCount },
              )}
            </span>
            <span>
              {t(
                forum.replyCount === 1 ? 'forums.replies_one' : 'forums.replies_other',
                { count: forum.replyCount },
              )}
            </span>
          </div>
          <div className="bs-timestamp mt-2 text-bb-xs text-bb-muted">
            {t('common.active', { time: formatTimeSince(forum.lastActive) })}
          </div>
        </div>
      </div>
    </li>
  )
}
