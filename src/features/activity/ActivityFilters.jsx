import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { activityFilters } from '../../data/activityData'
import { IconSearch } from '../../components/icons'

export function ActivityFilters({
  scope,
  onScopeChange,
  search,
  onSearchChange,
  filters = activityFilters,
}) {
  const { t } = useTranslation()

  return (
    <div className="activity-head-bar mb-4 flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0" role="tablist">
        {filters.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              role="tab"
              aria-selected={scope === f.id}
              onClick={() => onScopeChange(f.id)}
              className={clsx(
                'rounded-bb-inner px-3 py-1.5 text-bb-sm font-medium transition-colors',
                scope === f.id
                  ? 'bg-bb-primary text-white'
                  : 'bg-bb-alt text-bb-text hover:text-bb-heading',
              )}
            >
              {t(f.labelKey)}
            </button>
          </li>
        ))}
      </ul>

      <label className="relative block w-full bb:max-w-xs">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('common.search')}
          className="h-9 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
        />
      </label>
    </div>
  )
}
