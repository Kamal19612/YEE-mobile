import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const LayoutContext = createContext(null)

export function LayoutProvider({ children }) {
  const [panelOpen, setPanelOpen] = useState(true)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), [])
  const toggleMobilePanel = useCallback(() => setMobilePanelOpen((v) => !v), [])
  const closeMobilePanel = useCallback(() => setMobilePanelOpen(false), [])
  const toggleSearch = useCallback(() => setSearchOpen((v) => !v), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  const toggleDropdown = useCallback((id) => {
    setOpenDropdown((current) => (current === id ? null : id))
  }, [])

  const closeDropdowns = useCallback(() => setOpenDropdown(null), [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeDropdowns()
        closeSearch()
        closeMobilePanel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDropdowns, closeSearch, closeMobilePanel])

  useEffect(() => {
    const lock = mobilePanelOpen || searchOpen
    const previous = document.body.style.overflow
    if (lock) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobilePanelOpen, searchOpen])

  const value = useMemo(
    () => ({
      panelOpen,
      setPanelOpen,
      togglePanel,
      mobilePanelOpen,
      toggleMobilePanel,
      closeMobilePanel,
      searchOpen,
      toggleSearch,
      closeSearch,
      openDropdown,
      toggleDropdown,
      closeDropdowns,
    }),
    [
      panelOpen,
      togglePanel,
      mobilePanelOpen,
      toggleMobilePanel,
      closeMobilePanel,
      searchOpen,
      toggleSearch,
      closeSearch,
      openDropdown,
      toggleDropdown,
      closeDropdowns,
    ],
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider')
  return ctx
}
