import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconClose, IconSearch } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'

/** Référence: template-parts/header-search.php + common/search/search-form.php */
export function HeaderSearch() {
  const { t } = useTranslation()
  const { searchOpen, closeSearch } = useLayout()
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!searchOpen) return undefined
    const onPointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) closeSearch()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [searchOpen, closeSearch])

  if (!searchOpen) return null

  const submit = (e) => {
    e.preventDefault()
    const q = value.trim()
    closeSearch()
    navigate(q ? `/search?s=${encodeURIComponent(q)}` : '/search')
    setValue('')
  }

  return (
    <div className="fixed inset-0 z-search">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t('search.close')}
        onClick={closeSearch}
      />
      <div
        ref={panelRef}
        className="header-search-wrap relative border-b border-bb-border bg-bb-header shadow-dropdown"
      >
        <form onSubmit={submit} className="bb-container flex h-header items-center gap-2 sm:gap-3" role="search">
          <IconSearch className="shrink-0 text-bb-muted" />
          <input
            type="search"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('search.placeholder')}
            className="h-10 min-w-0 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base text-bb-heading outline-none focus:border-bb-primary"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 rounded-bb-btn bg-bb-primary px-3 py-2 text-bb-sm font-medium text-white"
          >
            {t('nav.search')}
          </button>
          <button
            type="button"
            onClick={closeSearch}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-bb-header-link hover:text-bb-primary"
            aria-label={t('search.close')}
          >
            <IconClose />
          </button>
        </form>
      </div>
    </div>
  )
}
