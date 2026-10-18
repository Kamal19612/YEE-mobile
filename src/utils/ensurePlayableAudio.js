/**
 * Rend un fichier audio lisible sur Safari / iOS.
 * Chrome / Firefox enregistrent souvent en WebM ou Ogg (Opus) — Safari refuse.
 * On décode côté navigateur source, puis on ré-encode en WAV PCM (universel).
 */

const SAFARI_OK = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
])

const NEEDS_CONVERT = new Set(['audio/webm', 'audio/ogg'])

/** Target voice quality — keeps 5 min under the 20 Mo upload cap. */
const TARGET_SAMPLE_RATE = 22050

export function audioBaseType(fileOrMime) {
  const raw = typeof fileOrMime === 'string' ? fileOrMime : fileOrMime?.type
  return String(raw || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
}

export function isSafariPlayableAudio(fileOrMime) {
  return SAFARI_OK.has(audioBaseType(fileOrMime))
}

/**
 * @param {string} mime
 * @returns {boolean}
 */
export function browserCanPlayAudioMime(mime) {
  if (typeof document === 'undefined') return true
  const base = audioBaseType(mime)
  if (!base) return false
  const el = document.createElement('audio')
  const probe = el.canPlayType(base) || el.canPlayType(`${base}; codecs="mp4a.40.2"`)
  return probe === 'probably' || probe === 'maybe'
}

/**
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function ensurePlayableAudio(file) {
  if (!file) return file
  const type = audioBaseType(file)
  if (!type.startsWith('audio/')) return file
  if (SAFARI_OK.has(type)) return file
  if (!NEEDS_CONVERT.has(type)) return file

  try {
    return await convertAudioFileToWav(file)
  } catch {
    // Garde l’original : le serveur tentera un transcodage si ffmpeg est dispo.
    return file
  }
}

/**
 * @param {File[]} files
 * @returns {Promise<File[]>}
 */
export async function ensurePlayableAudioFiles(files) {
  const list = Array.isArray(files) ? files.filter(Boolean) : []
  return Promise.all(
    list.map(async (file) => {
      if (audioBaseType(file).startsWith('audio/')) {
        return ensurePlayableAudio(file)
      }
      return file
    }),
  )
}

async function convertAudioFileToWav(file) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) {
    throw new Error('no_audio_context')
  }

  const buffer = await file.arrayBuffer()
  const ctx = new AudioCtx()
  let decoded
  try {
    decoded = await ctx.decodeAudioData(buffer.slice(0))
  } finally {
    await ctx.close().catch(() => {})
  }

  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)),
    TARGET_SAMPLE_RATE,
  )
  const source = offline.createBufferSource()
  source.buffer = mixToMono(decoded, offline)
  source.connect(offline.destination)
  source.start(0)
  const rendered = await offline.startRendering()
  const wav = encodeWav(rendered)
  const name = String(file.name || 'recording').replace(/\.[^.]+$/, '') || 'recording'
  return new File([wav], `${name}.wav`, { type: 'audio/wav' })
}

function mixToMono(decoded, offline) {
  if (decoded.numberOfChannels === 1 && decoded.sampleRate === offline.sampleRate) {
    return decoded
  }
  const length = Math.max(1, Math.ceil(decoded.duration * offline.sampleRate))
  const mono = offline.createBuffer(1, length, offline.sampleRate)
  const out = mono.getChannelData(0)
  const ratio = decoded.sampleRate / offline.sampleRate
  const channels = decoded.numberOfChannels
  for (let i = 0; i < length; i++) {
    const srcIndex = Math.min(decoded.length - 1, Math.floor(i * ratio))
    let sample = 0
    for (let c = 0; c < channels; c++) {
      sample += decoded.getChannelData(c)[srcIndex] || 0
    }
    out[i] = sample / channels
  }
  return mono
}

function encodeWav(audioBuffer) {
  const samples = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const dataLength = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return buffer
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
