import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchChatMediaBlob, peekChatMediaCache } from '../../api/messages'
import { IconDownload } from '../../components/icons'
import { ChatVoicePlayer } from './ChatVoicePlayer'

/**
 * Affiche une pièce jointe de conversation.
 * Chargement via blob authentifié + cache session (pas de re-fetch à chaque refresh du fil).
 */
export function ChatMedia({
  media,
  mine = false,
  avatarSrc = null,
  avatarName = '',
  timeLabel = '',
  statusLabel = '',
  embedMeta = false,
}) {
  const { t } = useTranslation()
  const initial = media?.url ? peekChatMediaCache(media.url) : null
  const [src, setSrc] = useState(initial?.objectUrl || '')
  const [mime, setMime] = useState(initial?.mime || guessChatMime(media))
  const [status, setStatus] = useState(initial?.objectUrl ? 'ready' : 'loading')

  useEffect(() => {
    if (!media?.url) {
      setSrc('')
      setStatus('error')
      return undefined
    }
    // Preview locale (envoi optimistic) — blob: déjà utilisable.
    if (media.local || String(media.url).startsWith('blob:')) {
      setSrc(media.url)
      setMime(guessChatMime(media))
      setStatus('ready')
      return undefined
    }
    const cached = peekChatMediaCache(media.url)
    if (cached?.objectUrl) {
      setSrc(cached.objectUrl)
      setMime(cached.mime || guessChatMime(media))
      setStatus('ready')
      return undefined
    }
    let cancelled = false
    setStatus('loading')
    fetchChatMediaBlob(media.url)
      .then((entry) => {
        if (cancelled) return
        setSrc(entry.objectUrl)
        setMime(entry.mime || guessChatMime(media))
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) {
          setSrc('')
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [media?.url, media?.contentType, media?.mediaType, media?.id])

  if (status === 'loading') {
    if (media.mediaType === 'audio') {
      return (
        <div
          className="flex h-12 w-[17rem] max-w-full animate-pulse items-center gap-2"
          aria-busy="true"
        >
          <span
            className={
              mine
                ? 'h-9 w-9 shrink-0 rounded-full bg-white/25'
                : 'h-9 w-9 shrink-0 rounded-full bg-bb-alt'
            }
          />
          <span
            className={
              mine ? 'h-3 flex-1 rounded-full bg-white/20' : 'h-3 flex-1 rounded-full bg-bb-alt'
            }
          />
          <span
            className={
              mine
                ? 'h-11 w-11 shrink-0 rounded-full bg-white/25'
                : 'h-11 w-11 shrink-0 rounded-full bg-bb-alt'
            }
          />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      )
    }
    return (
      <div
        className={
          mine
            ? 'aspect-[4/3] w-full min-h-[10rem] max-w-xs animate-pulse rounded-xl bg-white/20'
            : 'aspect-[4/3] w-full min-h-[10rem] max-w-xs animate-pulse rounded-xl bg-bb-alt'
        }
        aria-busy="true"
      >
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }

  if (status === 'error' || !src) {
    return (
      <p className="m-0 text-bb-xs opacity-80">{t('messages.mediaUnavailable')}</p>
    )
  }

  if (media.mediaType === 'audio') {
    return (
      <ChatVoicePlayer
        src={src}
        mime={mime}
        mine={mine}
        avatarSrc={avatarSrc}
        avatarName={avatarName}
        showAvatar
        timeLabel={embedMeta ? timeLabel : ''}
        statusLabel={embedMeta ? statusLabel : ''}
        downloadName={`message-${media.id || 'audio'}`}
      />
    )
  }

  // Image plein cadre type WhatsApp (meta en overlay si demandé).
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="my-messages__img">
      <img src={src} alt="" decoding="async" />
      {embedMeta && (timeLabel || statusLabel) ? (
        <span className="my-messages__img-meta">
          {timeLabel}
          {statusLabel ? <span aria-hidden>{statusLabel}</span> : null}
        </span>
      ) : null}
    </a>
  )
}

function guessChatMime(media) {
  if (media?.contentType) return media.contentType
  const url = String(media?.url || '')
  if (/\.webm(?:$|\?)/i.test(url)) return 'audio/webm'
  if (/\.ogg(?:$|\?)/i.test(url)) return 'audio/ogg'
  if (/\.m4a(?:$|\?)/i.test(url)) return 'audio/mp4'
  if (/\.mp3(?:$|\?)/i.test(url)) return 'audio/mpeg'
  if (/\.wav(?:$|\?)/i.test(url)) return 'audio/wav'
  if (media?.mediaType === 'audio') return ''
  return ''
}

/** Icône seule — à placer à côté de l’horodatage du message. */
export function ChatMediaDownload({ media, className = '' }) {
  const { t } = useTranslation()
  const [ready, setReady] = useState(() => Boolean(media?.url && peekChatMediaCache(media.url)?.objectUrl))

  useEffect(() => {
    if (!media?.url) {
      setReady(false)
      return undefined
    }
    const cached = peekChatMediaCache(media.url)
    if (cached?.objectUrl) {
      setReady(true)
      return undefined
    }
    let cancelled = false
    fetchChatMediaBlob(media.url)
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [media?.url])

  const handleDownload = () => {
    const entry = media?.url ? peekChatMediaCache(media.url) : null
    if (!entry?.objectUrl) return
    const a = document.createElement('a')
    a.href = entry.objectUrl
    a.download = entry.filename || 'media'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (!ready) return null

  return (
    <button
      type="button"
      onClick={handleDownload}
      title={t('messages.downloadMedia')}
      aria-label={t('messages.downloadMedia')}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-80 hover:opacity-100 ${className}`}
    >
      <IconDownload className="h-3.5 w-3.5" />
    </button>
  )
}
