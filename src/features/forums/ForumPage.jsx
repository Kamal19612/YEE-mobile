import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { useForum } from '../../hooks/useForums'
import { formatTimeSince } from '../activity/utils'
import { TopicForm } from './TopicForm'

/** Référence: bbpress/content-single-forum.php + loop-topics */
export function ForumPage() {
  const { t } = useTranslation()
  const { forumId } = useParams()
  const navigate = useNavigate()
  const { forum, topics, loading, createTopic } = useForum(forumId)
  const [showForm, setShowForm] = useState(false)

  if (!loading && !forum) {
    return (
      <div className="bb-card w-full p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">{t('forums.notFound')}</h1>
        <Link to="/forums" className="text-bb-sm text-bb-primary hover:underline">
          {t('forums.back')}
        </Link>
      </div>
    )
  }

  return (
    <div id="bbpress-forums" className="bb-content-area w-full max-w-content">
      <nav className="bbp-breadcrumb mb-3 text-bb-sm text-bb-muted">
        <Link to="/forums" className="hover:text-bb-primary">
          {t('forums.title')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-bb-heading">{forum?.title || '…'}</span>
      </nav>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{forum?.title}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{forum?.description}</p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('common.close') : t('forums.newDiscussion')}
        </Button>
      </header>

      {showForm && (
        <TopicForm
          onCancel={() => setShowForm(false)}
          onSubmit={async (payload) => {
            const topic = await createTopic(payload)
            setShowForm(false)
            navigate(`/forums/${forumId}/topics/${topic.id}`)
          }}
        />
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
          ))}
        </div>
      )}

      {!loading && topics.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('forums.topicsEmpty')}</div>
      )}

      {!loading && topics.length > 0 && (
        <ul className="bbp-topics m-0 list-none divide-y divide-bb-border overflow-hidden rounded-bb border border-bb-border bg-bb-content p-0">
          {topics.map((topic) => (
            <li key={topic.id} className="px-4 py-3 hover:bg-bb-alt">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {topic.sticky && (
                      <span className="rounded-bb-option bg-bb-label px-2 py-0.5 text-[10px] font-semibold uppercase text-bb-label-text">
                        {t('forums.sticky')}
                      </span>
                    )}
                    {topic.closed && (
                      <span className="rounded-bb-option bg-bb-alt px-2 py-0.5 text-[10px] font-semibold uppercase text-bb-muted">
                        {t('forums.closed')}
                      </span>
                    )}
                    <Link
                      to={`/forums/${forumId}/topics/${topic.id}`}
                      className="text-bb-md font-medium text-bb-heading hover:text-bb-primary"
                    >
                      {topic.title}
                    </Link>
                  </div>
                  <div className="text-bb-xs text-bb-muted">
                    {t('forums.startedBy', { name: topic.authorName })} · {formatTimeSince(topic.date)}
                  </div>
                </div>
                <div className="text-right text-bb-xs text-bb-muted">
                  <div>
                    <strong className="text-bb-heading">{topic.replyCount}</strong> {t('forums.repliesLabel')}
                  </div>
                  <div>
                    {t('forums.lastReply', { name: topic.lastReplyAuthor })} ·{' '}
                    {formatTimeSince(topic.lastReplyAt)}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
