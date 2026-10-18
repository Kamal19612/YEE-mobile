/**
 * Verrouillage de scroll compatible iOS Safari.
 * Compteur de verrous pour drawer + search + modales simultanés.
 */

let lockCount = 0
let savedScrollY = 0

export function lockBodyScroll() {
  lockCount += 1
  if (lockCount !== 1 || typeof document === 'undefined') {
    return unlockBodyScroll
  }

  savedScrollY = window.scrollY || window.pageYOffset || 0
  const { body, documentElement } = document
  documentElement.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${savedScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'

  return unlockBodyScroll
}

export function unlockBodyScroll() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0 || typeof document === 'undefined') return

  const { body, documentElement } = document
  documentElement.style.overflow = ''
  body.style.overflow = ''
  body.style.position = ''
  body.style.top = ''
  body.style.left = ''
  body.style.right = ''
  body.style.width = ''
  window.scrollTo(0, savedScrollY)
}
