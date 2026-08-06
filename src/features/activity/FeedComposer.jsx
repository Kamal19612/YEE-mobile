import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FEED_AUDIO_ACCEPT,
  FEED_IMAGE_ACCEPT,
  FEED_IMAGE_MAX_COUNT,
  validateFeedMedia,
} from '../../api/feed'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { IconImage, IconMic } from '../../components/icons'
import { useAuth } from '../../hooks/useAuth'

function isImageFile(file) {
  return file?.type?.startsWith('image/')
}

function isAudioFile(file) {
  return file?.type?.startsWith('audio/')
}

/** Composer Feed App API — texte et/ou médias (images XOR audio). */
export function FeedComposer({ onSubmit }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const imageInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const trimmed = content.trim()
  const displayName = user?.displayName || 'Guest'
  const hasImages = files.some(isImageFile)
  const hasAudio = files.some(isAudioFile)
  const canSubmit = (trimmed.length > 0 || files.length > 0) && !submitting

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, [])

  const clearMedia = () => {
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return []
    })
    setFiles([])
  }

  const reset = () => {
    setContent('')
    clearMedia()
    setError(null)
  }

  const applyFiles = (nextFiles) => {
    const err = validateFeedMedia(nextFiles)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return nextFiles.map((file, i) => ({
        id: `${file.name}-${file.size}-${i}`,
        name: file.name,
        type: isAudioFile(file) ? 'audio' : 'image',
        url: URL.createObjectURL(file),
      }))
    })
    setFiles(nextFiles)
  }

  const handleImagePick = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    if (hasAudio) {
      setError(t('stories.feed.mixedMedia'))
      return
    }
    const merged = [...files.filter(isImageFile), ...picked].slice(0, FEED_IMAGE_MAX_COUNT)
    applyFiles(merged)
  }

  const handleAudioPick = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (hasImages) {
      setError(t('stories.feed.mixedMedia'))
      return
    }
    applyFiles([picked])
  }

  const removeAt = (index) => {
    const next = files.filter((_, i) => i !== index)
    if (!next.length) {
      clearMedia()
      return
    }
    applyFiles(next)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    const clientErr = validateFeedMedia(files)
    if (clientErr) {
      setError(clientErr)
      return
    }
    if (!trimmed && files.length === 0) return

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit?.({
        content: trimmed,
        media: files.length ? files : undefined,
      })
      reset()
    } catch (err) {
      const code = err.code || err.body?.error?.code
      const msgByCode = {
        mixed_media_not_allowed: t('stories.feed.mixedMedia'),
        too_many_images: t('stories.feed.tooManyImages'),
        too_many_audio: t('stories.feed.tooManyAudio'),
        invalid_file_type: t('stories.feed.invalidType'),
        file_too_large: t('stories.feed.fileTooLarge'),
        media_upload_failed: t('stories.feed.uploadFailed'),
      }
      setError(
        msgByCode[code] ||
          err.message ||
          t('stories.feed.publishFailed'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 rounded-bb border border-bb-border bg-bb-content p-4 shadow-card transition-shadow duration-200 ease-bb focus-within:shadow-card-hover"
    >
      <div className="flex gap-3">
        <Avatar name={displayName} src={user?.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('stories.composer.placeholder', {
              name: displayName.split(' ')[0],
            })}
            className="mb-3 w-full resize-none rounded-bb-input border border-bb-border bg-bb-alt/60 px-3 py-2.5 text-bb-base text-bb-heading outline-none transition-[border-color,box-shadow,background-color] placeholder:text-bb-muted focus:border-bb-primary focus:bg-bb-content focus:shadow-[0_0_0_3px_rgba(47,91,255,0.12)]"
          />

          {previews.length > 0 && (
            <div className="mb-3">
              {hasAudio ? (
                <div className="relative rounded-bb-inner border border-bb-border bg-bb-alt p-3">
                  <p className="m-0 mb-2 pr-8 text-bb-sm font-medium text-bb-heading">
                    {previews[0].name}
                  </p>
                  <audio controls src={previews[0].url} className="w-full" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-bb-xs text-white"
                    onClick={() => removeAt(0)}
                  >
                    {t('common.remove')}
                  </button>
                </div>
              ) : (
                <ul
                  className={`m-0 grid list-none gap-2 p-0 ${
                    previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                  }`}
                >
                  {previews.map((p, index) => (
                    <li
                      key={p.id}
                      className="relative overflow-hidden rounded-bb-inner border border-bb-border"
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className="max-h-48 w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-bb-xs text-white"
                        onClick={() => removeAt(index)}
                      >
                        {t('common.remove')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="mb-2 m-0 text-bb-sm text-bb-danger">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input
                ref={imageInputRef}
                type="file"
                accept={FEED_IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={handleImagePick}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept={FEED_AUDIO_ACCEPT}
                className="hidden"
                onChange={handleAudioPick}
              />
              <button
                type="button"
                disabled={hasAudio || submitting}
                title={t('stories.feed.addPhoto')}
                aria-label={t('stories.feed.addPhoto')}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconImage className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={hasImages || submitting}
                title={t('stories.feed.addAudio')}
                aria-label={t('stories.feed.addAudio')}
                onClick={() => audioInputRef.current?.click()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconMic className="h-5 w-5" />
              </button>
            </div>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {submitting ? t('common.loading') : t('common.publish')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
