import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En local, le cookie refresh arrive souvent avec :
 * - Secure (refusé sur http://localhost)
 * - SameSite=None (exige Secure)
 * - Domain d’un host distant → refusé sur localhost
 * On réécrit uniquement via le proxy Vite (jamais en prod build).
 *
 * Path=/api/auth : le proxy expose /api/* en same-origin,
 * donc le cookie est renvoyé correctement sur POST /api/auth/refresh.
 */
function softenRefreshCookies(proxyRes) {
  const raw = proxyRes.headers['set-cookie']
  if (!raw) return
  const list = Array.isArray(raw) ? raw : [raw]
  proxyRes.headers['set-cookie'] = list.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]*/gi, '')
      .replace(/;\s*Secure/gi, '')
      // None exige Secure : en local HTTP on force Lax après strip Secure
      .replace(/;\s*SameSite=(?:Strict|None)/gi, '; SameSite=Lax'),
  )
}

function configureApiProxy(proxy) {
  proxy.on('proxyRes', (proxyRes, req, res) => {
    softenRefreshCookies(proxyRes)
    const ct = String(proxyRes.headers['content-type'] || '')
    if (ct.includes('text/event-stream')) {
      // Empêche le buffering du flux SSE (badge notif temps réel)
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('X-Accel-Buffering', 'no')
      if (typeof res.flushHeaders === 'function') res.flushHeaders()
    }
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    // Ex. VITE_BASE=/__dev__/ pour un aperçu sous-chemin sans toucher la prod.
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        // API sous /api → Spring (plus de collision avec les routes SPA)
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
          configure: configureApiProxy,
        },
        // Avatars / covers locaux restent hors préfixe API
        '/media': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 0,
          proxyTimeout: 0,
          configure: configureApiProxy,
        },
      },
    },
  }
})
