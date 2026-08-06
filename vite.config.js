import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En local, le cookie refresh App API arrive souvent avec :
 * - Secure (refusé sur http://localhost)
 * - SameSite=Strict
 * - Domain=.example.com (placeholder wp-config) → refusé sur localhost
 * On réécrit uniquement via le proxy Vite (jamais en prod build).
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const wpTarget =
    env.VITE_WP_PROXY_TARGET || 'https://sandybrown-rail-456461.hostingersite.com'

  return {
    // GitHub Pages project site: https://<user>.github.io/YEE/
    base: process.env.VITE_BASE || (mode === 'production' ? '/YEE/' : '/'),
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/wp-json': {
          target: wpTarget,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyRes', softenRefreshCookies)
          },
        },
      },
    },
  }
})
