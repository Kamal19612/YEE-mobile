const listeners = new Set()

export function publishMessageRealtime(payload) {
  if (!payload || typeof payload !== 'object') return
  listeners.forEach((fn) => {
    try {
      fn(payload)
    } catch {
      /* ignore */
    }
  })
}

export function subscribeMessageRealtime(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
