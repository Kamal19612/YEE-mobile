/* AfrEA-YEE — service worker (cache shell + Web Push iOS/Android) */
const CACHE = 'afrea-yee-v8'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest']

function isApiRequest(url) {
  try {
    const path = new URL(url).pathname
    return /^\/api(\/|$)/.test(path) || /^\/media\/(?:avatars|covers)\//.test(path)
  } catch {
    return false
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await Promise.all(
        PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Ne pas intercepter l’API (SSE, auth, etc.) : le navigateur gère nativement.
  // Évite « Uncaught (in promise) Failed to fetch » sur abort / offline.
  if (isApiRequest(request.url)) return

  // HTML / navigation : réseau d’abord pour prendre les nouveaux bundles après deploy
  const accept = request.headers.get('accept') || ''
  let pathname = '/'
  try {
    pathname = new URL(request.url).pathname
  } catch {
    return
  }
  const isHtmlNav =
    request.mode === 'navigate' ||
    accept.includes('text/html') ||
    /\/index\.html$/.test(pathname)

  if (isHtmlNav) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match('/index.html') || Response.error()
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached || Response.error())
      return cached || fetched
    }),
  )
})

/** Web Push — même flux sur Android Chrome et PWA iOS (écran d’accueil, ≥ 16.4). */
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data = {}
      try {
        data = event.data ? event.data.json() : {}
      } catch {
        try {
          data = { body: event.data ? event.data.text() : '' }
        } catch {
          data = {}
        }
      }

      const title = data.title || 'YEE network'
      const options = {
        body: data.body || '',
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-192.png',
        tag: data.tag || undefined,
        data: { url: data.url || '/notifications' },
        renotify: Boolean(data.tag),
      }

      // Toujours afficher la notif OS (desktop inclus, même onglet ouvert).
      // Les toasts SSE restent en complément quand l’app est au premier plan.
      await self.registration.showNotification(title, options)
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = (event.notification.data && event.notification.data.url) || '/notifications'
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus()
          if ('navigate' in client) {
            return client.navigate(targetUrl)
          }
          return undefined
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
