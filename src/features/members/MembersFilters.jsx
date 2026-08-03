import { memberSortOptions, memberTypeFilters } from '../../data/membersData'
import { IconSearch } from '../../components/icons'

export function MembersFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  view,
  onViewChange,
  total = 0,
}) {
  return (
    <div className="flex bp-secondary-header mb-5 flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
      <div className="bb-item-count text-bb-sm text-bb-text">
        <span className="bb-count font-semibold text-bb-heading">{total}</span>{' '}
        {total === 1 ? 'Member' : 'Members'}
      </div>

      <div className="push-right flex flex-wrap items-center gap-2">
        <label className="relative block min-w-0 w-full flex-1 sm:min-w-[180px] bb:flex-none bb:w-auto">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search members..."
            className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
          />
        </label>

        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
        >
          {memberTypeFilters.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
        >
          {memberSortOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="grid-filters flex overflow-hidden rounded-bb-input border border-bb-border">
          <button
            type="button"
            className={`px-3 py-1.5 text-bb-xs font-medium ${view === 'grid' ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'}`}
            onClick={() => onViewChange('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-bb-xs font-medium ${view === 'list' ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'}`}
            onClick={() => onViewChange('list')}
          >
            List
          </button>
        </div>
      </div>
    </div>
  )
}
