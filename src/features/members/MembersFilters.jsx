import { useTranslation } from 'react-i18next'
import { MEMBER_COUNTRIES, memberSortOptions } from '../../data/membersData'
import { IconSearch } from '../../components/icons'

export function MembersFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  country,
  onCountryChange,
  view,
  onViewChange,
  total = 0,
}) {
  const { t } = useTranslation()

  return (
    <div className="mb-5">
      <div className="flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
        <div className="bb-item-count text-bb-sm text-bb-text">
          {t(total === 1 ? 'members.count_one' : 'members.count_other', { count: total })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block min-w-0 w-full flex-1 sm:min-w-[180px] bb:flex-none bb:w-auto">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('members.search')}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </label>

          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            aria-label={t('members.filters.country')}
            className="h-10 min-w-0 flex-1 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary sm:flex-none sm:min-w-[140px]"
          >
            <option value="">{t('members.filters.country')} — {t('members.filters.all')}</option>
            {MEMBER_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label={t('members.sort.label')}
            className="h-10 min-w-0 flex-1 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary sm:flex-none"
          >
            {memberSortOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {t(f.labelKey)}
              </option>
            ))}
          </select>

          <div className="grid-filters flex overflow-hidden rounded-bb-input border border-bb-border">
            <button
              type="button"
              className={`px-3 py-2 text-bb-xs font-medium ${view === 'grid' ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'}`}
              onClick={() => onViewChange('grid')}
            >
              {t('members.grid')}
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-bb-xs font-medium ${view === 'list' ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'}`}
              onClick={() => onViewChange('list')}
            >
              {t('members.list')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
