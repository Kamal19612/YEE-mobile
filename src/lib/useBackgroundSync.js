import { useEffect, useRef } from 'react'
import { subscribe } from './queryEvents'

function isTextEntryFocused() {
  const el = document.activeElement
  if (!el || el === document.body) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/**
 * Abonne un hook à des clés d’invalidation + optionnellement au retour focus / onglet.
 * Les rechargements sont debounceés pour coalescer plusieurs mutations rapides.
 *
 * @param {string|string[]} keys
 * @param {() => void|Promise<void>} silentReload  — ne doit PAS activer le spinner principal
 * @param {{ enabled?: boolean, focus?: boolean, debounceMs?: number }} [options]
 */
export function useBackgroundSync(
  keys,
  silentReload,
  { enabled = true, focus = true, debounceMs = 400 } = {},
) {
  const reloadRef = useRef(silentReload)
  reloadRef.current = silentReload

  const keyList = Array.isArray(keys) ? keys : [keys]
  const keySig = keyList.join('|')

  useEffect(() => {
    if (!enabled) return undefined

    let timer = null
    let focusWait = null
    const run = (detail) => {
      Promise.resolve(reloadRef.current?.(detail)).catch(() => {})
    }
    const schedule = (detail) => {
      window.clearTimeout(timer)
      if (focusWait) {
        document.removeEventListener('focusout', focusWait)
        focusWait = null
      }
      const attempt = () => {
        if (isTextEntryFocused()) {
          focusWait = () => {
            document.removeEventListener('focusout', focusWait)
            focusWait = null
            window.setTimeout(() => schedule(detail), 0)
          }
          document.addEventListener('focusout', focusWait)
          return
        }
        timer = window.setTimeout(() => run(detail), debounceMs)
      }
      attempt()
    }

    const unsubs = keyList.map((key) => subscribe(key, schedule))

    return () => {
      window.clearTimeout(timer)
      if (focusWait) document.removeEventListener('focusout', focusWait)
      unsubs.forEach((u) => u())
    }
    // keySig captures keyList contents
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, keySig, debounceMs])

  useEffect(() => {
    if (!enabled || !focus) return undefined

    let timer = null
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        Promise.resolve(reloadRef.current?.({ reason: 'focus' })).catch(() => {})
      }, debounceMs)
    }

    const onFocus = () => schedule()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, focus, debounceMs])
}
