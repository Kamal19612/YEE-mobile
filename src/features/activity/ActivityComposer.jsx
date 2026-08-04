import { useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { IconImage, IconMic, IconVideo } from '../../components/icons'
import {
  PUBLICATION_STATUS,
  STORY_COUNTRIES,
  STORY_LANGUAGES,
  STORY_THEMATICS,
} from '../../data/activityData'
import { useOffline } from '../../hooks/useOffline'
import { useAuth } from '../../hooks/useAuth'

/**
 * Composeur de récits AfrEA-YEE
 * Réf. visuelle: #whats-new-form + exigences TDR (consentement, anonymisation, tags, modération)
 */
export function ActivityComposer({ onSubmit, user: userProp }) {
  const { t } = useTranslation()
  const { user: authUser } = useAuth()
  const user = userProp || authUser || { id: 0, displayName: 'Guest', avatar: null }
  const { online, enqueue } = useOffline()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [focused, setFocused] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [country, setCountry] = useState('')
  const [thematic, setThematic] = useState('')
  const [language, setLanguage] = useState('fr')
  const [consent, setConsent] = useState(false)
  const [anonymous, setAnonymous] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [queuedMsg, setQueuedMsg] = useState(false)
  const fileRef = useRef(null)

  const hasBody = title.trim().length > 0 || content.trim().length > 0 || mediaPreview
  const tagsReady = Boolean(country && thematic && language)

  const reset = () => {
    setTitle('')
    setContent('')
    setMediaPreview(null)
    setCountry('')
    setThematic('')
    setLanguage('fr')
    setConsent(false)
    setAnonymous(false)
    setConsentError(false)
    setFocused(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    let type = 'image'
    if (file.type.startsWith('audio/')) type = 'audio'
    else if (file.type.startsWith('video/')) type = 'video'
    setMediaPreview({ id: `local-${Date.now()}`, type, url, alt: file.name, name: file.name })
    e.target.value = ''
  }

  const submit = async (status) => {
    if (!hasBody || submitting) return
    if (status === PUBLICATION_STATUS.PENDING && !consent) {
      setConsentError(true)
      return
    }
    setConsentError(false)
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        media: mediaPreview ? [mediaPreview] : [],
        tags: { country, thematic, language },
        consent,
        anonymous,
        status,
      }

      if (!online) {
        enqueue({ type: 'story', payload })
        setQueuedMsg(true)
        reset()
        return
      }

      await onSubmit?.(payload)
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  const expanded = focused || hasBody || consent || anonymous

  return (
    <form
      id="whats-new-form"
      name="story-composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit(PUBLICATION_STATUS.PENDING)
      }}
      className={clsx(
        'mb-5 rounded-bb border border-bb-border bg-bb-content p-4 shadow-card',
        focused && 'focus-in',
      )}
    >
      {!online && (
        <p className="mb-3 rounded-bb-inner bg-[rgba(237,150,21,0.12)] px-3 py-2 text-bb-sm text-bb-warning">
          Hors-ligne : la soumission sera mise en file et synchronisée plus tard.
        </p>
      )}
      {queuedMsg && online && (
        <p className="mb-3 rounded-bb-inner bg-[rgba(20,181,80,0.12)] px-3 py-2 text-bb-sm text-bb-success">
          Récit ajouté à la file de synchronisation.
        </p>
      )}
      <div className="flex gap-3">
        <Avatar name={user.displayName} src={user.avatar} size="md" />
        <div className="min-w-0 flex-1">
          {expanded && (
            <div className="mb-2">
              <label className="mb-1 block text-bb-xs font-medium text-bb-muted" htmlFor="story-title">
                {t('stories.composer.title')}
              </label>
              <input
                id="story-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('stories.composer.titlePlaceholder')}
                className="w-full rounded-bb-input border border-bb-border bg-bb-content px-3 py-2 text-bb-base font-medium text-bb-heading outline-none placeholder:font-normal placeholder:text-bb-muted focus:border-bb-primary"
              />
            </div>
          )}

          <div id="whats-new-textarea" className="mb-3">
            <textarea
              id="whats-new"
              rows={expanded ? 4 : 1}
              value={content}
              onFocus={() => setFocused(true)}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('stories.composer.placeholder', {
                name: user.displayName.split(' ')[0],
              })}
              className="w-full resize-none rounded-bb-input border border-bb-border bg-bb-content px-3 py-2.5 text-bb-base text-bb-heading outline-none placeholder:text-bb-muted focus:border-bb-primary"
            />
          </div>

          {mediaPreview && (
            <div className="relative mb-3 overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt">
              {mediaPreview.type === 'image' && (
                <img src={mediaPreview.url} alt={mediaPreview.alt} className="max-h-72 w-full object-cover" />
              )}
              {mediaPreview.type === 'audio' && (
                <div className="p-4">
                  <p className="m-0 mb-2 text-bb-sm font-medium text-bb-heading">{mediaPreview.name}</p>
                  <audio controls src={mediaPreview.url} className="w-full" />
                </div>
              )}
              {mediaPreview.type === 'video' && (
                <video controls src={mediaPreview.url} className="max-h-72 w-full bg-black" />
              )}
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-bb-xs text-white"
                onClick={() => setMediaPreview(null)}
              >
                {t('common.remove')}
              </button>
            </div>
          )}

          {expanded && (
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <TagSelect
                label={t('stories.composer.country')}
                value={country}
                onChange={setCountry}
                options={STORY_COUNTRIES.map((c) => ({ value: c, label: c }))}
                placeholder={t('stories.composer.select')}
              />
              <TagSelect
                label={t('stories.composer.thematic')}
                value={thematic}
                onChange={setThematic}
                options={STORY_THEMATICS.map((c) => ({ value: c, label: c }))}
                placeholder={t('stories.composer.select')}
              />
              <TagSelect
                label={t('stories.composer.language')}
                value={language}
                onChange={setLanguage}
                options={STORY_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
                placeholder={t('stories.composer.select')}
              />
            </div>
          )}

          {expanded && (
            <div className="mb-3 space-y-2 rounded-bb-inner border border-bb-border bg-bb-alt p-3">
              <label className="flex cursor-pointer items-start gap-2 text-bb-sm text-bb-heading">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked)
                    if (e.target.checked) setConsentError(false)
                  }}
                  className="mt-0.5 accent-[var(--bb-primary-color)]"
                />
                <span>{t('stories.composer.consent')}</span>
              </label>
              {consentError && (
                <p className="m-0 text-bb-xs text-bb-danger">{t('stories.composer.consentRequired')}</p>
              )}
              <label className="flex cursor-pointer items-start gap-2 text-bb-sm text-bb-heading">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="mt-0.5 accent-[var(--bb-primary-color)]"
                />
                <span>{t('stories.composer.anonymize')}</span>
              </label>
            </div>
          )}

          <div id="whats-new-toolbar" className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,audio/*,video/*"
                className="hidden"
                onChange={handleFile}
              />
              <ToolbarBtn
                label={t('stories.composer.photo')}
                onClick={() => {
                  fileRef.current.accept = 'image/*'
                  fileRef.current?.click()
                }}
              >
                <IconImage className="h-5 w-5" />
              </ToolbarBtn>
              <ToolbarBtn
                label={t('stories.composer.audio')}
                onClick={() => {
                  fileRef.current.accept = 'audio/*'
                  fileRef.current?.click()
                }}
              >
                <IconMic className="h-5 w-5" />
              </ToolbarBtn>
              <ToolbarBtn
                label={t('stories.composer.video')}
                onClick={() => {
                  fileRef.current.accept = 'video/*'
                  fileRef.current?.click()
                }}
              >
                <IconVideo className="h-5 w-5" />
              </ToolbarBtn>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!hasBody || submitting}
                onClick={() => submit(PUBLICATION_STATUS.DRAFT)}
              >
                {t('stories.composer.saveDraft')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!hasBody || !tagsReady || submitting}
              >
                {submitting ? t('stories.composer.submitting') : t('stories.composer.submitModeration')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function TagSelect({ label, value, onChange, options, placeholder }) {
  return (
    <label className="block text-bb-xs font-medium text-bb-muted">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ToolbarBtn({ children, label, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-bb-inner text-bb-muted transition-colors hover:bg-bb-alt hover:text-bb-heading"
    >
      {children}
    </button>
  )
}
