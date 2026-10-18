import { ENDPOINTS } from '../config/api'
import { appApiFetch } from '../api/client'
import { canUseWebPushApis, platformAllowsPush } from './pwaInstall'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

function swUrl() {
  const base = import.meta.env.BASE_URL || '/'
  try {
    return new URL('sw.js', `${window.location.origin}${base}`).href
  } catch {
    return '/sw.js'
  }
}

async function readyRegistration() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register(swUrl())
    if (registration.waiting) {
      registration.waiting.postMessage?.({ type: 'SKIP_WAITING' })
    }
    // Attendre qu’un SW contrôle la page (sinon subscribe échoue souvent sur desktop).
    if (!navigator.serviceWorker.controller) {
      await Promise.race([
        new Promise((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
            once: true,
          })
        }),
        new Promise((resolve) => window.setTimeout(resolve, 3000)),
      ])
    }
    return navigator.serviceWorker.ready
  } catch (err) {
    console.warn('[webPush] SW register failed', err)
    return null
  }
}

async function saveSubscription(subscription) {
  const json = subscription.toJSON()
  if (!json?.endpoint || !json?.keys?.p256dh || !json?.keys?.auth) {
    throw new Error('incomplete_subscription')
  }
  await appApiFetch(ENDPOINTS.notifications.pushSubscribe, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }),
  })
}

async function subscribeWithKey(registration, applicationServerKey) {
  // 1) Réutiliser une souscription locale déjà valide
  let subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    try {
      await saveSubscription(subscription)
      return subscription
    } catch (err) {
      console.warn('[webPush] existing subscription rejected, recreating', err)
      try {
        await subscription.unsubscribe()
      } catch {
        /* ignore */
      }
    }
  }

  // 2) Nouvelle souscription
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  })
}

/** GET /notifications/push/vapid-public-key */
export async function fetchVapidPublicKey() {
  const data = await appApiFetch(ENDPOINTS.notifications.pushVapidKey, { auth: true })
  return {
    enabled: Boolean(data?.enabled),
    publicKey: data?.publicKey ? String(data.publicKey) : '',
  }
}

/**
 * Demande la permission (si besoin), s’abonne PushManager, envoie la subscription au backend.
 * @returns {'subscribed'|'denied'|'unsupported'|'needs_install'|'disabled'|'error'|'os_blocked'}
 */
export async function enableWebPush() {
  if (!canUseWebPushApis()) return 'unsupported'
  if (!platformAllowsPush()) return 'needs_install'

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return 'denied'

  let vapid
  try {
    vapid = await fetchVapidPublicKey()
  } catch {
    return 'error'
  }
  if (!vapid.enabled || !vapid.publicKey) return 'disabled'

  const registration = await readyRegistration()
  if (!registration?.pushManager) return 'unsupported'

  try {
    const applicationServerKey = urlBase64ToUint8Array(vapid.publicKey)
    if (applicationServerKey.byteLength !== 65) {
      console.warn('[webPush] unexpected VAPID key length', applicationServerKey.byteLength)
      return 'error'
    }

    const subscription = await subscribeWithKey(registration, applicationServerKey)
    // saveSubscription est idempotent (upsert endpoint) — OK si déjà fait en reuse.
    await saveSubscription(subscription)

    try {
      localStorage.setItem('yee.push.enabled', '1')
    } catch {
      /* ignore */
    }
    return 'subscribed'
  } catch (err) {
    console.warn('[webPush] enable failed', err)
    const name = err?.name || ''
    const msg = String(err?.message || '')
    if (
      name === 'AbortError' ||
      name === 'NotAllowedError' ||
      /permission|denied|push service|registration failed/i.test(msg)
    ) {
      return 'os_blocked'
    }
    return 'error'
  }
}

export async function disableWebPush() {
  if (!canUseWebPushApis()) return
  const registration = await readyRegistration()
  const subscription = await registration?.pushManager?.getSubscription?.()
  if (!subscription) {
    try {
      localStorage.removeItem('yee.push.enabled')
    } catch {
      /* ignore */
    }
    return
  }
  const endpoint = subscription.endpoint
  try {
    await appApiFetch(ENDPOINTS.notifications.pushUnsubscribe, {
      method: 'DELETE',
      auth: true,
      body: JSON.stringify({ endpoint }),
    })
  } catch {
    /* ignore réseau — on retire quand même localement */
  }
  try {
    await subscription.unsubscribe()
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem('yee.push.enabled')
  } catch {
    /* ignore */
  }
}

export function wasPushEnabledLocally() {
  try {
    return localStorage.getItem('yee.push.enabled') === '1'
  } catch {
    return false
  }
}
