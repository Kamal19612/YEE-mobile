import { useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { IconMic } from '../../components/icons'
import { audioBaseType, browserCanPlayAudioMime } from '../../utils/ensurePlayableAudio'

/**
 * Note vocale style WhatsApp — classes .msg-voice (messages.css).
 */
export function ChatVoicePlayer({
  src,
  mime,
  mine = false,
  avatarSrc = null,
  avatarName = '',
  showAvatar = true,
  timeLabel = '',
  statusLabel = '',
  downloadName = 'audio',
  className = '',
}) {
  const { t } = useTranslation()
  const labelId = useId()
  const audioRef = useRef(null)
  const trackRef = useRef(null)
  const rafRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [unsupported, setUnsupported] = useState(() =>
    mime ? !browserCanPlayAudioMime(mime) : false,
  )

  useEffect(() => {
    if (!mime) {
      setUnsupported(false)
      return
    }
    setUnsupported(!browserCanPlayAudioMime(mime))
  }, [mime, src])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !src || unsupported) return undefined

    const syncTime = () => setCurrent(el.currentTime || 0)

    const stopRaf = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }

    const tick = () => {
      syncTime()
      if (!el.paused && !el.ended) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = 0
      }
    }

    const startRaf = () => {
      stopRaf()
      rafRef.current = requestAnimationFrame(tick)
    }

    const onMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration)
    }
    const onEnded = () => {
      stopRaf()
      setPlaying(false)
      setCurrent(0)
    }
    const onPlay = () => {
      setPlaying(true)
      startRaf()
    }
    const onPause = () => {
      stopRaf()
      syncTime()
      setPlaying(false)
    }
    const onSeeked = () => syncTime()
    const onError = () => {
      stopRaf()
      setUnsupported(true)
      setPlaying(false)
    }

    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('durationchange', onMeta)
    el.addEventListener('ended', onEnded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('error', onError)
    return () => {
      stopRaf()
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('durationchange', onMeta)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('error', onError)
    }
  }, [src, unsupported])

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    setPlaying(false)
    setCurrent(0)
    setDuration(0)
  }, [src])

  if (!src) return null

  if (unsupported) {
    return (
      <div className={clsx('px-1 py-1 text-bb-xs', className)}>
        <p className="m-0 mb-1 opacity-80">{t('common.audioUnsupported')}</p>
        <a
          href={src}
          download={downloadFilename(downloadName, mime)}
          className="font-medium underline-offset-2 hover:underline"
        >
          {t('common.downloadAudio')}
        </a>
      </div>
    )
  }

  const safeDuration = duration > 0 && Number.isFinite(duration) ? duration : 0
  const progress = safeDuration > 0 ? Math.min(1, current / safeDuration) : 0
  const displayTime = playing || current > 0 ? current : safeDuration

  const toggle = async () => {
    const el = audioRef.current
    if (!el) return
    try {
      if (el.paused) await el.play()
      else el.pause()
    } catch {
      setUnsupported(true)
    }
  }

  const seekFromClientX = (clientX) => {
    const el = audioRef.current
    const track = trackRef.current
    if (!el || !track || !safeDuration) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    el.currentTime = ratio * safeDuration
    setCurrent(el.currentTime)
  }

  const avatarBlock = showAvatar ? (
    <div className="msg-voice__avatar">
      <Avatar
        name={avatarName || t('messages.voiceMessage')}
        src={avatarSrc}
        size="md"
        className="!h-11 !w-11 !ring-1 !ring-black/10"
      />
      <span
        className={clsx('msg-voice__mic', mine ? 'msg-voice__mic--mine' : 'msg-voice__mic--theirs')}
        aria-hidden
      >
        <IconMic className="h-2.5 w-2.5" />
      </span>
    </div>
  ) : null

  const playButton = (
    <button
      type="button"
      onClick={toggle}
      className="msg-voice__play"
      aria-label={playing ? t('messages.pauseAudio') : t('messages.playAudio')}
    >
      {playing ? (
        <PauseIcon className="h-5 w-5" />
      ) : (
        <PlayIcon className="ml-0.5 h-5 w-5" />
      )}
    </button>
  )

  const barCount = WAVE_HEIGHTS.length
  const waveBlock = (
    <div className="msg-voice__body">
      <span id={labelId} className="sr-only">
        {t('messages.voiceMessage')}
      </span>
      <button
        type="button"
        ref={trackRef}
        className="msg-voice__wave-btn"
        onClick={(e) => seekFromClientX(e.clientX)}
        aria-label={t('messages.seekAudio')}
      >
        <span className="msg-voice__bars">
          {WAVE_HEIGHTS.map((h, i) => {
            // Même repère que le curseur : barre allumée dès que la tête de lecture l’atteint.
            const filled = progress > i / barCount
            return (
              <span
                key={i}
                className={clsx('msg-voice__bar', filled && 'is-on')}
                style={{ height: `${h}px` }}
                aria-hidden
              />
            )
          })}
        </span>
        <span
          className="msg-voice__thumb"
          style={{ left: `${progress * 100}%` }}
          aria-hidden
        />
      </button>
      <div className="msg-voice__meta">
        <span>{formatAudioTime(displayTime)}</span>
        {(timeLabel || statusLabel) && (
          <span className="inline-flex items-center gap-1">
            {timeLabel}
            {statusLabel ? <span className="my-messages__checks">{statusLabel}</span> : null}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className={clsx('msg-voice', className)} role="group" aria-labelledby={labelId}>
      <audio ref={audioRef} src={src} preload="metadata" playsInline className="hidden">
        {mime ? <source src={src} type={audioBaseType(mime)} /> : null}
      </audio>

      {mine ? (
        <>
          {avatarBlock}
          {playButton}
          {waveBlock}
        </>
      ) : (
        <>
          {playButton}
          {waveBlock}
          {avatarBlock}
        </>
      )}
    </div>
  )
}

const WAVE_HEIGHTS = [
  8, 14, 10, 18, 12, 22, 9, 16, 24, 11, 20, 13, 19, 8, 15, 23, 12, 17, 10, 21, 14, 9, 18, 11, 16,
  22, 13, 19, 10, 15,
]

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

function PlayIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72L19.5 12 8 5.14z" />
    </svg>
  )
}

function PauseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

function downloadFilename(base, mime) {
  const safe = String(base || 'audio').replace(/[^\w.-]+/g, '_')
  const type = audioBaseType(mime)
  if (type === 'audio/webm') return `${safe}.webm`
  if (type === 'audio/ogg') return `${safe}.ogg`
  if (type === 'audio/mpeg') return `${safe}.mp3`
  if (type === 'audio/mp4' || type === 'audio/aac' || type === 'audio/x-m4a') return `${safe}.m4a`
  if (type === 'audio/wav' || type === 'audio/wave' || type === 'audio/x-wav') return `${safe}.wav`
  return safe
}
