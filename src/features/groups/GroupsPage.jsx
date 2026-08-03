import { useState } from 'react'
import clsx from 'clsx'
import { IconSearch } from '../../components/icons'
import { groupSortOptions, groupTypeFilters } from '../../data/groupsData'
import { useGroups } from '../../hooks/useGroups'
import { GroupCard } from './GroupCard'

/** Référence: buddypress/groups/index.php */
export function GroupsPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('grid')
  const { groups, total, loading, error, toggleMembership } = useGroups({
    search,
    sort,
    typeFilter,
  })

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <header className="mb-4">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Groups</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">Discover communities and join the conversation.</p>
      </header>

      <div className="mb-5 flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
        <div className="bb-item-count text-bb-sm text-bb-text">
          <span className="font-semibold text-bb-heading">{total}</span> {total === 1 ? 'Group' : 'Groups'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block min-w-[180px] flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="h-9 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
          >
            {groupTypeFilters.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
          >
            {groupSortOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-bb-input border border-bb-border">
            {['grid', 'list'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-bb-xs font-medium capitalize ${
                  view === v ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
          ))}
        </div>
      )}

      {!loading && error && <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>}

      {!loading && !error && groups.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">Sorry, no groups were found.</div>
      )}

      {!loading && groups.length > 0 && (
        <ul
          id="groups-list"
          className={clsx(
            'm-0 list-none p-0',
            view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3',
          )}
        >
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              view={view}
              onToggleMembership={toggleMembership}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
