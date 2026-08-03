import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const defaultTokens = {
  '--bb-primary-color': '#385DFF',
  '--bb-body-background-color': '#FAFBFD',
  '--bb-content-background-color': '#FFFFFF',
  '--bb-content-alternate-background-color': '#F2F4F5',
  '--bb-content-border-color': '#D6D9DD',
  '--bb-headings-color': '#1E2132',
  '--bb-body-text-color': '#5A5A5A',
  '--bb-alternate-text-color': '#9B9C9F',
  '--bb-header-background': '#ffffff',
  '--bb-header-links': '#1E2132',
  '--bb-header-links-hover': '#385DFF',
  '--bb-header-height': '76px',
  '--bb-sidenav-background': '#ffffff',
  '--bb-button-radius': '6px',
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
