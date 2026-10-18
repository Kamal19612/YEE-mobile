import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FEED_AUDIO_ACCEPT,
  FEED_DOCUMENT_ACCEPT,
  FEED_IMAGE_ACCEPT,
  FEED_IMAGE_MAX_COUNT,
  validateFeedMedia,
} from '../../api/feed'
import { ensurePlayableAudioFiles } from '../../utils/ensurePlayableAudio'
import { formatFileSize } from '../../utils/formatFileSize'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { CompatibleAudio } from '../../components/ui/CompatibleAudio'
import { IconClose, IconFile, IconImage, IconMic, IconPaperclip } from '../../components/icons'
import { useAuth } from '../../hooks/useAuth'
import { formatRecordingTime, useAudioRecorder } from '../../hooks/useAudioRecorder'

function isImageFile(file) {
  return file?.type?.startsWith('image/')
}

function isAudioFile(file) {
  return file?.type?.startsWith('audio/')
}

function isDocumentFile(file) {
  const type = String(file?.type || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  return type === 'application/pdf' || /\.pdf$/i.test(String(file?.name || ''))
}

function previewKind(file) {
  if (isAudioFile(file)) return 'audio'
  if (isDocumentFile(file)) return 'document'
  return 'image'
}

/** Composer Feed App API — texte et/ou médias (images XOR audio XOR PDF). */
export function FeedComposer({ onSubmit }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const imageInputRef = useRef(null)
  const audioInputRef = useRef(null)
  const documentInputRef = useRef(null)
  const { supported: micSupported, recording, elapsedMs, start, stop, cancel } =
    useAudioRecorder()

  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadPct, setUploadPct] = useState(null)
  const [error, setError] = useState(null)

  const trimmed = content.trim()
  const displayName = user?.displayName || 'Guest'
  const hasImages = files.some(isImageFile)
  const hasAudio = files.some(isAudioFile)
  const hasDocument = files.some(isDocumentFile)
  const canSubmit =
    (trimmed.length > 0 || files.length > 0) && !submitting && !recording

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
    setUploadPct(null)
  }

  const applyFiles = async (nextFiles) => {
    const normalized = await ensurePlayableAudioFiles(nextFiles)
    const err = validateFeedMedia(normalized)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return normalized.map((file, i) => ({
        id: `${file.name}-${file.size}-${i}`,
        name: file.name,
        type: previewKind(file),
        fileType: file.type || '',
        size: file.size,
        url: URL.createObjectURL(file),
      }))
    })
    setFiles(normalized)
  }

  const handleImagePick = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return
    if (hasAudio || hasDocument || recording) {
      setError(t('stories.feed.mixedMedia'))
      return
    }
    const merged = [...files.filter(isImageFile), ...picked].slice(0, FEED_IMAGE_MAX_COUNT)
    void applyFiles(merged)
  }

  const handleAudioPick = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (hasImages || hasDocument) {
      setError(t('stories.feed.mixedMedia'))
      return
    }
    if (recording) cancel()
    void applyFiles([picked])
  }

  const handleDocumentPick = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (hasImages || hasAudio || recording) {
      setError(t('stories.feed.mixedMedia'))
      return
    }
    void applyFiles([picked])
  }

  const removeAt = (index) => {
    const next = files.filter((_, i) => i !== index)
    if (!next.length) {
      clearMedia()
      return
    }
    void applyFiles(next)
  }

  const openAudioFilePicker = () => {
    if (hasImages || hasDocument || submitting) return
    audioInputRef.current?.click()
  }

  const handleMicClick = async () => {
    if (hasImages || hasDocument || submitting) return

    if (recording) {
      const file = await stop()
      if (file) void applyFiles([file])
      return
    }

    if (!micSupported) {
      setError(t('stories.feed.micUnsupported'))
      openAudioFilePicker()
      return
    }

    try {
      setError(null)
      await start()
    } catch (err) {
      const denied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message === 'Permission denied'
      setError(denied ? t('stories.feed.micDenied') : t('stories.feed.micUnsupported'))
      openAudioFilePicker()
    }
  }

  const handleCancelRecording = () => {
    cancel()
    setError(null)
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
    const hasMedia = files.length > 0
    setUploadPct(hasMedia ? 0 : null)
    try {
      await onSubmit?.({
        content: trimmed,
        media: hasMedia ? files : undefined,
        onProgress: hasMedia
          ? (pct) => setUploadPct(typeof pct === 'number' ? pct : 0)
          : undefined,
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
        upload_error: t('stories.feed.uploadFailed'),
        missing_file: t('stories.feed.invalidType'),
        timeout: t('stories.feed.uploadFailed'),
      }
      setError(
        msgByCode[code] ||
          err.message ||
          t('stories.feed.publishFailed'),
      )
      setUploadPct(null)
    } finally {
      setSubmitting(false)
    }
  }

  const recordLabel = recording
    ? t('stories.feed.stopRecording')
    : t('stories.feed.recordAudio')

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

          {recording && (
            <div className="mb-3 flex items-center gap-3 rounded-bb-inner border border-bb-danger/30 bg-bb-danger/5 px-3 py-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-bb-danger animate-pulse"
                aria-hidden
              />
              <p className="m-0 flex-1 text-bb-sm font-medium text-bb-heading">
                {t('stories.feed.recording', {
                  time: formatRecordingTime(elapsedMs),
                })}
              </p>
              <button
                type="button"
                className="text-bb-sm text-bb-muted underline-offset-2 hover:text-bb-heading hover:underline"
                onClick={handleCancelRecording}
              >
                {t('stories.feed.cancelRecording')}
              </button>
            </div>
          )}

          {previews.length > 0 && !recording && (
            <div className="mb-3">
              {hasAudio ? (
                <div className="relative rounded-bb-inner border border-bb-border bg-bb-alt p-3">
                  <p className="m-0 mb-2 pr-8 text-bb-sm font-medium text-bb-heading">
                    {previews[0].name}
                  </p>
                  <CompatibleAudio src={previews[0].url} mime={previews[0].fileType || 'audio/wav'} className="w-full" />
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                    title={t('common.remove')}
                    aria-label={t('common.remove')}
                    onClick={() => removeAt(0)}
                  >
                    <IconClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : hasDocument ? (
                <div className="relative overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt">
                  <div className="flex items-center gap-3 p-3 pr-12">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-bb-inner bg-bb-primary/10 text-bb-primary">
                      <IconFile className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="m-0 truncate text-bb-sm font-medium text-bb-heading">{previews[0].name}</p>
                      <p className="m-0 text-bb-xs text-bb-muted">
                        PDF
                        {previews[0].size ? ` · ${formatFileSize(previews[0].size)}` : ''}
                      </p>
                    </div>
                  </div>
                  <iframe
                    title={previews[0].name}
                    src={`${previews[0].url}#page=1&view=FitH`}
                    className="block h-56 w-full border-0 border-t border-bb-border bg-white"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                    title={t('common.remove')}
                    aria-label={t('common.remove')}
                    onClick={() => removeAt(0)}
                  >
                    <IconClose className="h-3.5 w-3.5" />
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
                      className={
                        previews.length === 1
                          ? 'relative flex max-h-48 min-h-[8rem] items-center justify-center overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt'
                          : 'relative aspect-square overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt'
                      }
                    >
                      <img
                        src={p.url}
                        alt={p.name}
                        className={
                          previews.length === 1
                            ? 'max-h-48 w-full object-contain object-center'
                            : 'absolute inset-0 h-full w-full object-contain object-center'
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                        title={t('common.remove')}
                        aria-label={t('common.remove')}
                        onClick={() => removeAt(index)}
                      >
                        <IconClose className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="mb-2 m-0 text-bb-sm text-bb-danger">{error}</p>}

          {submitting && uploadPct != null && (
            <div
              className="mb-3"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadPct}
              aria-label={t('stories.feed.uploadProgress', { percent: uploadPct })}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="m-0 text-bb-xs font-medium text-bb-muted">
                  {uploadPct >= 100
                    ? t('stories.feed.uploadProcessing')
                    : t('stories.feed.uploadProgress', { percent: uploadPct })}
                </p>
                <span className="text-bb-xs font-semibold tabular-nums text-bb-primary">
                  {Math.min(100, uploadPct)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bb-alt">
                <div
                  className="h-full rounded-full bg-bb-primary transition-[width] duration-150 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, uploadPct))}%` }}
                />
              </div>
            </div>
          )}

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
              <input
                ref={documentInputRef}
                type="file"
                accept={FEED_DOCUMENT_ACCEPT}
                className="hidden"
                onChange={handleDocumentPick}
              />
              <button
                type="button"
                disabled={hasAudio || hasDocument || recording || submitting}
                title={t('stories.feed.addPhoto')}
                aria-label={t('stories.feed.addPhoto')}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconImage className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={hasImages || hasAudio || recording || submitting}
                title={t('stories.feed.addDocument')}
                aria-label={t('stories.feed.addDocument')}
                onClick={() => documentInputRef.current?.click()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconPaperclip className="h-5 w-5" />
              </button>
              <button
                type="button"
                disabled={hasImages || hasDocument || submitting}
                title={recordLabel}
                aria-label={recordLabel}
                aria-pressed={recording}
                onClick={handleMicClick}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-bb-inner disabled:cursor-not-allowed disabled:opacity-40 ${
                  recording
                    ? 'bg-bb-danger/15 text-bb-danger hover:bg-bb-danger/25'
                    : 'text-bb-muted hover:bg-bb-alt hover:text-bb-primary'
                }`}
              >
                {recording ? (
                  <span className="block h-3.5 w-3.5 rounded-sm bg-current" aria-hidden />
                ) : (
                  <IconMic className="h-5 w-5" />
                )}
              </button>
            </div>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {submitting
                ? uploadPct != null
                  ? t('stories.feed.uploading', { percent: Math.min(100, uploadPct) })
                  : t('common.loading')
                : t('common.publish')}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
