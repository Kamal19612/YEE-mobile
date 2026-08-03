import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconClose, IconSearch } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'

/** Référence: template-parts/header-search.php + common/search/search-form.php */
export function HeaderSearch() {
  const { searchOpen, closeSearch } = useLayout()
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  if (!searchOpen) return null

  const submit = (e) => {
    e.preventDefault()
    const q = value.trim()
    closeSearch()
    navigate(q ? `/search?s=${encodeURIComponent(q)}` : '/search')
    setValue('')
  }

  return (
    <div className="header-search-wrap fixed inset-x-0 top-0 z-mobile border-b border-bb-border bg-bb-header shadow-dropdown">
      <form onSubmit={submit} className="bb-container flex h-header items-center gap-3" role="search">
        <IconSearch className="shrink-0 text-bb-muted" />
        <input
          type="search"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search members, groups, forums..."
          className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base text-bb-heading outline-none focus:border-bb-primary"
        />
        <button
          type="submit"
          className="hidden rounded-bb-btn bg-bb-primary px-3 py-2 text-bb-sm font-medium text-white bb:inline-flex"
        >
          Search
        </button>
        <button
          type="button"
          onClick={closeSearch}
          className="flex h-10 w-10 items-center justify-center text-bb-header-link hover:text-bb-primary"
          aria-label="Close search"
        >
          <IconClose />
        </button>
      </form>
    </div>
  )
}
