import { useState } from 'react'
import { IconSearch } from '../../components/icons'
import { useForums } from '../../hooks/useForums'
import { ForumCard } from './ForumCard'

/** Référence: bbpress.php + content-archive-forum / loop-forums */
export function ForumsPage() {
  const [search, setSearch] = useState('')
  const { forums, loading } = useForums(search)

  return (
    <div id="bbpress-forums" className="bb-content-area w-full">
      <header className="entry-header mb-5 flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
        <div>
          <h1 className="entry-title m-0 text-bb-xl font-semibold text-bb-heading">Forums</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">Browse discussions across the community.</p>
        </div>
        <div id="forums-dir-search" role="search" className="bs-dir-search bs-forums-search w-full bb:max-w-xs">
          <form
            className="bs-search-form relative"
            onSubmit={(e) => e.preventDefault()}
          >
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
            <input
              type="search"
              id="bbp_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search forums..."
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-2 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </form>
        </div>
      </header>

      {loading && (
        <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-56 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
          ))}
        </ul>
      )}

      {!loading && forums.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">No forums found.</div>
      )}

      {!loading && forums.length > 0 && (
        <ul className="forums bbp-forums m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {forums.map((forum) => (
            <ForumCard key={forum.id} forum={forum} />
          ))}
        </ul>
      )}
    </div>
  )
}
