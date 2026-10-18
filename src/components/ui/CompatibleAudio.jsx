import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { audioBaseType, browserCanPlayAudioMime } from '../../utils/ensurePlayableAudio'

/**
 * Lecteur audio tolérant Safari / iOS.
 * Si le navigateur ne déclare pas le MIME, on affiche un message + téléchargement.
 */
export function CompatibleAudio({
  src,
  mime,
  className = 'w-full',
  downloadName = 'audio',
  preload = 'metadata',
}) {
  const { t } = useTranslation()
  const audioRef = useRef(null)
  const [unsupported, setUnsupported] = useState(() => {
    if (!mime) return false
    return !browserCanPlayAudioMime(mime)
  })

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
    const onError = () => setUnsupported(true)
    el.addEventListener('error', onError)
    return () => el.removeEventListener('error', onError)
  }, [src, unsupported])

  if (!src) return null

  if (unsupported) {
    const label = mimeLabel(mime)
    return (
      <div className="rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm text-bb-text">
        <p className="m-0 mb-2">
          {label
            ? t('common.audioUnsupportedFormat', { format: label })
            : t('common.audioUnsupported')}
        </p>
        <a
          href={src}
          download={downloadFilename(downloadName, mime)}
          className="font-medium text-bb-primary hover:underline"
        >
          {t('common.downloadAudio')}
        </a>
      </div>
    )
  }

  return (
    <audio
      ref={audioRef}
      controls
      src={src}
      className={className}
      preload={preload}
      playsInline
    >
      {mime ? <source src={src} type={audioBaseType(mime)} /> : null}
    </audio>
  )
}

function mimeLabel(mime) {
  const base = audioBaseType(mime)
  if (base === 'audio/webm') return 'WebM'
  if (base === 'audio/ogg') return 'OGG'
  if (base === 'audio/mpeg') return 'MP3'
  if (base === 'audio/mp4' || base === 'audio/aac' || base === 'audio/x-m4a') return 'M4A'
  if (base === 'audio/wav' || base === 'audio/wave' || base === 'audio/x-wav') return 'WAV'
  return ''
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
