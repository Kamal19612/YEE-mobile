/** Détection plateforme / mode installé pour PWA + Web Push. */

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  // iPadOS 13+ se présente comme MacIntel avec touch
  return navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent || '')
}

/** PWA ouverte depuis l’écran d’accueil (requis pour push iOS). */
export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = Boolean(window.navigator?.standalone)
  return Boolean(mq || iosStandalone)
}

export function canUseWebPushApis() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * iOS Safari (onglet) : push impossible tant que non installé.
 * Android / desktop / iOS standalone : OK côté plateforme.
 */
export function platformAllowsPush() {
  if (!canUseWebPushApis()) return false
  if (isIosDevice() && !isStandaloneDisplay()) return false
  return true
}

export function shouldShowIosInstallHint() {
  return isIosDevice() && !isStandaloneDisplay()
}
