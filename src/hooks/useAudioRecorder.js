import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Formats acceptés par AudioUploadValidator (Spring).
 * AAC/MP4 d’abord : Safari / iOS lit ces formats ; WebM/Opus est ensuite
 * converti en WAV avant upload (voir ensurePlayableAudio).
 */
const CANDIDATE_MIME_TYPES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

const MAX_RECORD_MS = 5 * 60 * 1000

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return ''
  }
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

function extensionFor(mime) {
  const base = String(mime || '').split(';')[0].toLowerCase()
  if (base === 'audio/ogg') return 'ogg'
  if (base === 'audio/mp4' || base === 'audio/aac' || base === 'audio/x-m4a') return 'm4a'
  return 'webm'
}

/**
 * Enregistrement micro via MediaRecorder (WebM/Opus ou MP4 selon le navigateur).
 * @returns {{
 *   supported: boolean,
 *   recording: boolean,
 *   elapsedMs: number,
 *   start: () => Promise<void>,
 *   stop: () => Promise<File|null>,
 *   cancel: () => void,
 * }}
 */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const mimeRef = useRef('')
  const startedAtRef = useRef(0)
  const timerRef = useRef(0)
  const maxTimerRef = useRef(0)
  const stopResolverRef = useRef(null)

  const supported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = 0
    }
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current)
      maxTimerRef.current = 0
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => () => cleanupStream(), [cleanupStream])

  const finishFile = useCallback(() => {
    const chunks = chunksRef.current
    const mime = (mimeRef.current || chunks[0]?.type || 'audio/webm').split(';')[0]
    cleanupStream()
    setRecording(false)
    setElapsedMs(0)
    if (!chunks.length) return null
    const blob = new Blob(chunks, { type: mime })
    if (!blob.size) return null
    const ext = extensionFor(mime)
    return new File([blob], `recording-${Date.now()}.${ext}`, { type: mime })
  }, [cleanupStream])

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      cleanupStream()
      setRecording(false)
      setElapsedMs(0)
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      stopResolverRef.current = resolve
      try {
        recorder.stop()
      } catch {
        stopResolverRef.current = null
        resolve(finishFile())
      }
    })
  }, [cleanupStream, finishFile])

  const cancel = useCallback(() => {
    stopResolverRef.current = null
    const recorder = mediaRecorderRef.current
    try {
      if (recorder && recorder.state !== 'inactive') recorder.stop()
    } catch {
      /* ignore */
    }
    cleanupStream()
    setRecording(false)
    setElapsedMs(0)
  }, [cleanupStream])

  const start = useCallback(async () => {
    if (!supported) {
      throw new Error('unsupported')
    }
    if (mediaRecorderRef.current) {
      cancel()
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    const mime = pickMimeType()
    mimeRef.current = mime
    chunksRef.current = []

    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const resolve = stopResolverRef.current
      stopResolverRef.current = null
      const file = finishFile()
      resolve?.(file)
    }

    recorder.start(250)
    startedAtRef.current = Date.now()
    setElapsedMs(0)
    setRecording(true)

    timerRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current)
    }, 200)

    maxTimerRef.current = window.setTimeout(() => {
      void stop()
    }, MAX_RECORD_MS)
  }, [supported, cancel, finishFile, stop])

  return { supported, recording, elapsedMs, start, stop, cancel }
}

export function formatRecordingTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
