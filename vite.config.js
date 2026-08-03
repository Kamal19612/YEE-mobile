import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages project site: https://<user>.github.io/Buddyboss/
  base: process.env.VITE_BASE || (mode === 'production' ? '/Buddyboss/' : '/'),
  plugins: [react()],
}))
