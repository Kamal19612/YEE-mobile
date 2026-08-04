import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { STORY_LANGUAGES } from '../../data/activityData'
import { stripHtml } from '../activity/utils'
import { formatTimeSince } from '../activity/utils'

export function ModerationCard({ story, acting, onApprove, onReject }) {
  const { t } = useTranslation()
  const [comment, setComment] = useState('')
  const [showReject, setShowReject] = useState(false)
  const displayName = story.anonymous ? t('stories.anonymousAuthor') : story.userName
  const lang =
    STORY_LANGUAGES.find((l) => l.code === story.tags?.language)?.label || story.tags?.language

  return (
    <article className="rounded-bb border border-bb-border border-l-4 border-l-bb-warning bg-bb-content p-4 shadow-card">
      <header className="mb-3 flex gap-3">
        <Avatar name={story.anonymous ? '?' : story.userName} src={story.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-bb-heading">{displayName}</div>
          <div className="text-bb-sm text-bb-muted">
            {t('moderation.submitted', { time: formatTimeSince(story.date) })}
          </div>
          {story.tags && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {story.tags.country && <Chip>{story.tags.country}</Chip>}
              {story.tags.thematic && <Chip>{story.tags.thematic}</Chip>}
              {lang && <Chip>{lang}</Chip>}
              {story.anonymous && <Chip>{t('moderation.anonymous')}</Chip>}
              {story.consent && <Chip>{t('moderation.consentOk')}</Chip>}
            </div>
          )}
        </div>
      </header>

      {story.title && (
        <h3 className="mb-2 mt-0 text-bb-lg font-semibold text-bb-heading">{story.title}</h3>
      )}
      <p className="mb-3 whitespace-pre-wrap text-bb-base text-bb-heading">
        {stripHtml(story.content)}
      </p>

      {story.media?.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-bb-inner">
          {story.media.map((m) =>
            m.type === 'image' ? (
              <img key={m.id} src={m.url} alt={m.alt || ''} className="max-h-64 w-full object-cover" />
            ) : m.type === 'audio' ? (
              <audio key={m.id} controls src={m.url} className="w-full" />
            ) : (
              <video key={m.id} controls src={m.url} className="max-h-64 w-full bg-black" />
            ),
          )}
        </div>
      )}

      {showReject && (
        <div className="mb-3">
          <label className="mb-1 block text-bb-xs font-medium text-bb-muted" htmlFor={`reject-${story.id}`}>
            {t('moderation.rejectComment')}
          </label>
          <textarea
            id={`reject-${story.id}`}
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('moderation.rejectPlaceholder')}
            className="w-full rounded-bb-input border border-bb-border px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
          />
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={acting}
          onClick={() => onApprove?.(story.id)}
        >
          {t('moderation.approve')}
        </Button>
        {!showReject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={acting}
            onClick={() => setShowReject(true)}
          >
            {t('moderation.reject')}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="!border-bb-danger !text-bb-danger"
              disabled={acting || !comment.trim()}
              onClick={() => onReject?.(story.id, comment.trim())}
            >
              {t('moderation.confirmReject')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="link"
              disabled={acting}
              onClick={() => {
                setShowReject(false)
                setComment('')
              }}
            >
              {t('common.cancel')}
            </Button>
          </>
        )}
      </footer>
    </article>
  )
}

function Chip({ children }) {
  return (
    <span className="inline-flex rounded-bb-option bg-[var(--bb-label-background-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--bb-label-text-color)]">
      {children}
    </span>
  )
}
