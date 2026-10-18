/**
 * Cache PDF partagé + limite de concurrence réseau.
 * Évite les téléchargements parallèles massifs sur la liste Ressources
 * et les re-fetchs entre couverture / détail / feed.
 */

const MAX_CACHE = 10
const MAX_CONCURRENT = 2

const cache = new Map()
const inflight = new Map()
const waitQueue = []
let activeFetches = 0

function remember(key, entry) {
  if (cache.size >= MAX_CACHE && !cache.has(key)) {
    const oldest = cache.keys().next().value
    const prev = cache.get(oldest)
    if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl)
    cache.delete(oldest)
  }
  const existing = cache.get(key)
  if (existing?.objectUrl && existing.objectUrl !== entry.objectUrl) {
    URL.revokeObjectURL(existing.objectUrl)
  }
  cache.set(key, entry)
}

function pumpQueue() {
  while (activeFetches < MAX_CONCURRENT && waitQueue.length > 0) {
    const next = waitQueue.shift()
    activeFetches += 1
    Promise.resolve()
      .then(next.fn)
      .then(next.resolve, next.reject)
      .finally(() => {
        activeFetches -= 1
        pumpQueue()
      })
  }
}

function withFetchSlot(fn) {
  return new Promise((resolve, reject) => {
    waitQueue.push({ fn, resolve, reject })
    pumpQueue()
  })
}

function isPdfBytes(bytes, mime) {
  const type = String(mime || '').toLowerCase()
  if (type.includes('pdf')) return true
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/**
 * @param {string} key
 * @param {() => Promise<Blob>} fetcher
 * @returns {Promise<{ bytes: Uint8Array, objectUrl: string, blob: Blob }>}
 */
export async function getCachedPdfFile(key, fetcher) {
  const cacheKey = String(key || '')
  if (!cacheKey) throw new Error('pdf_cache_key_required')

  const hit = cache.get(cacheKey)
  if (hit) return hit

  const pending = inflight.get(cacheKey)
  if (pending) return pending

  const task = withFetchSlot(async () => {
    const blob = await fetcher()
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (!isPdfBytes(bytes, blob.type)) {
      throw new Error('not_pdf')
    }
    const typed = new Blob([bytes], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(typed)
    const entry = { bytes, objectUrl, blob: typed }
    remember(cacheKey, entry)
    return entry
  })

  inflight.set(cacheKey, task)
  try {
    return await task
  } finally {
    inflight.delete(cacheKey)
  }
}

/**
 * Cache générique (miniatures JPEG, etc.) avec la même limite de concurrence.
 * @param {string} key
 * @param {() => Promise<Blob>} fetcher
 * @returns {Promise<{ objectUrl: string, blob: Blob }>}
 */
export async function getCachedBlob(key, fetcher) {
  const cacheKey = String(key || '')
  if (!cacheKey) throw new Error('blob_cache_key_required')

  const hit = cache.get(cacheKey)
  if (hit) return hit

  const pending = inflight.get(cacheKey)
  if (pending) return pending

  const task = withFetchSlot(async () => {
    const blob = await fetcher()
    if (!blob || blob.size === 0) throw new Error('empty_blob')
    const objectUrl = URL.createObjectURL(blob)
    const entry = { objectUrl, blob, bytes: null }
    remember(cacheKey, entry)
    return entry
  })

  inflight.set(cacheKey, task)
  try {
    return await task
  } finally {
    inflight.delete(cacheKey)
  }
}

export function peekCachedPdfFile(key) {
  return cache.get(String(key || '')) || null
}
