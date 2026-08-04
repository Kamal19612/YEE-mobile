import { useTranslation } from 'react-i18next'
import {
  MEMBER_COUNTRIES,
  MEMBER_LANGUAGES,
  MEMBER_REGIONS,
  MEMBER_THEMATICS,
  memberSortOptions,
  memberTypeFilters,
} from '../../data/membersData'
import { IconSearch } from '../../components/icons'

export function MembersFilters({
  search,
  onSearchChange,
  sort,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  country,
  onCountryChange,
  region,
  onRegionChange,
  language,
  onLanguageChange,
  thematic,
  onThematicChange,
  view,
  onViewChange,
  total = 0,
}) {
  const { t } = useTranslation()

  return (
    <div className="mb-5 space-y-3">
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
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
          >
            {memberTypeFilters.map((f) => (
              <option key={f.id} value={f.id}>
                {t(f.labelKey)}
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
                {t(f.labelKey)}
              </option>
            ))}
          </select>

          <div className="grid-filters flex overflow-hidden rounded-bb-input border border-bb-border">
            <button
              type="button"
              className={`px-3 py-1.5 text-bb-xs font-medium ${view === 'grid' ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'}`}
              onClick={() => onViewChange('grid')}
            >
              {t('members.grid')}
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-bb-xs font-medium ${view === 'list' ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'}`}
              onClick={() => onViewChange('list')}
            >
              {t('members.list')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label={t('members.filters.country')}
          value={country}
          onChange={onCountryChange}
          options={MEMBER_COUNTRIES.map((c) => ({ value: c, label: c }))}
          allLabel={t('members.filters.all')}
        />
        <FilterSelect
          label={t('members.filters.region')}
          value={region}
          onChange={onRegionChange}
          options={MEMBER_REGIONS.map((c) => ({ value: c, label: c }))}
          allLabel={t('members.filters.all')}
        />
        <FilterSelect
          label={t('members.filters.language')}
          value={language}
          onChange={onLanguageChange}
          options={MEMBER_LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          allLabel={t('members.filters.all')}
        />
        <FilterSelect
          label={t('members.filters.thematic')}
          value={thematic}
          onChange={onThematicChange}
          options={MEMBER_THEMATICS.map((c) => ({ value: c, label: c }))}
          allLabel={t('members.filters.all')}
        />
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, allLabel }) {
  return (
    <label className="block text-bb-xs font-medium text-bb-muted">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
