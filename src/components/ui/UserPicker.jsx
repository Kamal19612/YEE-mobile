import { useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { searchUsers } from '../../api/users'
import { Avatar } from './Avatar'

const DEBOUNCE_MS = 300
const MIN_QUERY_LEN = 2

/**
 * Recherche d’utilisateurs (nom ou e-mail) → sélectionne un utilisateur avec son id réel.
 * Réutilisable (invitations de groupe, référents institutions, …).
 */
export function UserPicker({
  value = null,
  onChange,
  placeholder,
  disabled = false,
  className,
  inputClassName,
}) {
  const { t } = useTranslation()
  const listId = useId()
  const rootRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (value) {
      setQuery(value.displayName || '')
      setResults([])
      setOpen(false)
      setSearched(false)
    }
  }, [value])

  useEffect(() => {
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (value && q === (value.displayName || '').trim()) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return undefined
    }
    if (q.length < MIN_QUERY_LEN) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const list = await searchUsers(q)
        if (!cancelled) {
          setResults(list)
          setSearched(true)
          setOpen(true)
        }
      } catch {
        if (!cancelled) {
          setResults([])
          setSearched(true)
          setOpen(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, value])

  function selectUser(user) {
    onChange?.(user)
    setQuery(user.displayName || '')
    setResults([])
    setOpen(false)
    setSearched(false)
  }

  function clearSelection() {
    onChange?.(null)
    setQuery('')
    setResults([])
    setOpen(false)
    setSearched(false)
  }

  const showList = open && !disabled && (loading || searched)

  return (
    <div ref={rootRef} className={clsx('relative min-w-0 w-full flex-1 sm:min-w-[180px]', className)}>
      <div className="flex gap-1">
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            if (value) onChange?.(null)
            setOpen(true)
          }}
          onFocus={() => {
            if (searched || loading) setOpen(true)
          }}
          placeholder={placeholder || t('common.search')}
          className={clsx(
            'h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary disabled:opacity-60',
            inputClassName,
          )}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={clearSelection}
            className="h-10 shrink-0 rounded-bb-input border border-bb-border px-2 text-bb-sm text-bb-muted hover:text-bb-heading"
            aria-label={t('common.close')}
          >
            ×
          </button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-bb-inner border border-bb-border bg-white py-1 shadow-[0_8px_24px_rgba(18,26,43,0.12)]"
        >
          {loading && (
            <li className="px-3 py-2 text-bb-sm text-bb-muted">{t('common.loading')}</li>
          )}
          {!loading && searched && results.length === 0 && (
            <li className="px-3 py-2 text-bb-sm text-bb-muted">{t('search.empty')}</li>
          )}
          {!loading &&
            results.map((user) => (
              <li key={user.id} role="option">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bb-alt"
                  onClick={() => selectUser(user)}
                >
                  <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-bb-sm font-medium text-bb-heading">
                      {user.displayName}
                    </span>
                    {user.profession ? (
                      <span className="block truncate text-bb-xs text-bb-muted">
                        {user.profession}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
