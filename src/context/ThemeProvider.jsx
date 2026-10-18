import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const defaultTokens = {
  '--bb-primary-color': '#2F5BFF',
  '--bb-accent-color': '#C8922A',
  '--bb-body-background-color': '#EEF1F7',
  '--bb-content-background-color': '#FFFFFF',
  '--bb-content-alternate-background-color': '#F4F6FA',
  '--bb-content-border-color': '#DDE2EB',
  '--bb-headings-color': '#121A2B',
  '--bb-body-text-color': '#4A5568',
  '--bb-alternate-text-color': '#8B93A7',
  '--bb-header-background': 'rgba(255, 255, 255, 0.86)',
  '--bb-header-links': '#121A2B',
  '--bb-header-links-hover': '#2F5BFF',
  '--bb-header-height': '76px',
  '--bb-sidenav-background': 'rgba(255, 255, 255, 0.94)',
  '--bb-button-radius': '8px',
}

const ThemeContext = createContext(null)

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = Number.parseInt(clean, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

export function ThemeProvider({ children, tokens: initialTokens = {} }) {
  const [tokens, setTokens] = useState({ ...defaultTokens, ...initialTokens })

  useEffect(() => {
    const root = document.documentElement
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value)
      if (key === '--bb-primary-color') {
        const rgb = hexToRgb(value)
        if (rgb) root.style.setProperty('--bb-primary-color-rgb', rgb)
      }
    })
  }, [tokens])

  const value = useMemo(
    () => ({
      tokens,
      setTokens,
      updateToken: (key, value) => setTokens((prev) => ({ ...prev, [key]: value })),
    }),
    [tokens],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
