import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { useTopic } from '../../hooks/useForums'
import { formatTimeSince, stripHtml } from '../activity/utils'
import { ReplyForm } from './ReplyForm'

/** Référence: content-single-topic.php + loop-single-reply + form-reply */
export function TopicPage() {
  const { t } = useTranslation()
  const { forumId, topicId } = useParams()
  const { topic, forum, replies, loading, addReply } = useTopic(topicId)
  const [replyParent, setReplyParent] = useState(0)

  const tree = useMemo(() => buildReplyTree(replies), [replies])

  if (!loading && !topic) {
    return (
      <div className="bb-card w-full p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">{t('forums.topicNotFound')}</h1>
        <Link to={`/forums/${forumId}`} className="text-bb-sm text-bb-primary hover:underline">
          {t('forums.backToForum')}
        </Link>
      </div>
    )
  }

  return (
    <div id="bbpress-forums" className="bb-content-area bs-replies-wrapper w-full max-w-content">
      <nav className="bbp-breadcrumb mb-3 text-bb-sm text-bb-muted">
        <Link to="/forums" className="hover:text-bb-primary">
          {t('forums.title')}
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/forums/${forumId}`} className="hover:text-bb-primary">
          {forum?.title || t('forums.title')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-bb-heading">{topic?.title || '…'}</span>
      </nav>

      {loading && <div className="h-40 animate-pulse rounded-bb border border-bb-border bg-bb-content" />}

      {!loading && topic && (
        <>
          <article className="bbp-topic-lead bb-card mb-4 p-5">
            <header className="mb-4 flex items-start gap-3">
              <Avatar name={topic.authorName} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{topic.title}</h1>
                <div className="mt-1 text-bb-sm text-bb-muted">
                  {t('common.by')} <span className="font-medium text-bb-heading">{topic.authorName}</span> ·{' '}
                  {formatTimeSince(topic.date)}
                  {topic.closed && ` · ${t('forums.closed')}`}
                </div>
              </div>
            </header>
            <div className="bbp-topic-content whitespace-pre-wrap text-bb-base text-bb-heading">
              {stripHtml(topic.content)}
            </div>
            <div className="mt-4 flex gap-4 border-t border-bb-border pt-3 text-bb-xs text-bb-muted">
              <span>
                {t(
                  topic.replyCount === 1 ? 'forums.replies_one' : 'forums.replies_other',
                  { count: topic.replyCount },
                )}
              </span>
              <span>{t('forums.voices', { count: topic.voiceCount })}</span>
            </div>
          </article>

          <div className="replies-content">
            <h2 className="mb-3 text-bb-md font-semibold text-bb-heading">
              {t('forums.repliesTitle', { count: replies.length })}
            </h2>

            {!replies.length && (
              <div className="bb-card mb-4 p-6 text-center text-bb-sm text-bb-muted">
                {t('forums.noRepliesFirst')}
              </div>
            )}

            <ul className="bbp-replies m-0 list-none space-y-3 p-0">
              {tree.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  onReply={(id) => setReplyParent(id)}
                />
              ))}
            </ul>

            {replyParent > 0 && (
              <div className="mb-2 text-bb-sm text-bb-muted">
                {t('forums.replyingNested')}{' '}
                <button
                  type="button"
                  className="text-bb-primary hover:underline"
                  onClick={() => setReplyParent(0)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}

            <ReplyForm
              replyToName={topic.authorName}
              disabled={topic.closed}
              onSubmit={async ({ content }) => {
                await addReply({ content, parentId: replyParent })
                setReplyParent(0)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function ReplyItem({ reply, onReply, depth = 0 }) {
  const { t } = useTranslation()

  return (
    <li
      id={`post-${reply.id}`}
      className="bbp-reply bb-card p-4"
      style={{ marginLeft: depth ? Math.min(depth * 16, 48) : 0 }}
    >
      <div className="flex gap-3">
        <Avatar name={reply.authorName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-bb-sm">
            <span className="font-semibold text-bb-heading">{reply.authorName}</span>
            <span className="text-bb-xs text-bb-muted">{formatTimeSince(reply.date)}</span>
          </div>
          <div className="bbp-reply-content whitespace-pre-wrap text-bb-sm text-bb-heading">
            {stripHtml(reply.content)}
          </div>
          {depth < 2 && (
            <button
              type="button"
              className="mt-2 text-bb-xs font-medium text-bb-primary hover:underline"
              onClick={() => onReply(reply.id)}
            >
              {t('forums.reply')}
            </button>
          )}
          {reply.children?.length > 0 && (
            <ul className="mt-3 list-none space-y-3 p-0">
              {reply.children.map((child) => (
                <ReplyItem key={child.id} reply={child} onReply={onReply} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  )
}

function buildReplyTree(replies) {
  const map = new Map()
  const roots = []
  replies.forEach((r) => map.set(r.id, { ...r, children: [] }))
  map.forEach((r) => {
    if (r.parentId && map.has(r.parentId)) map.get(r.parentId).children.push(r)
    else roots.push(r)
  })
  return roots
}
