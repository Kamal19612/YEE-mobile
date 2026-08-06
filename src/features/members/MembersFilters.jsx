import { useTranslation } from 'react-i18next'
import { IconSearch } from '../../components/icons'
import { InstitutionCascadePicker } from '../institutions/InstitutionCascadePicker'

export function MembersFilters({
  search,
  onSearchChange,
  institutionId,
  onInstitutionChange,
  view,
  onViewChange,
  total = null,
  page = 1,
  perPage = 12,
}) {
  const { t } = useTranslation()
  const countLabel =
    total == null
      ? t('members.pageLabel', { page })
      : t(total === 1 ? 'members.count_one' : 'members.count_other', { count: total })

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
        <div className="bb-item-count text-bb-sm text-bb-text">{countLabel}</div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block min-w-0 w-full flex-1 sm:min-w-[200px] bb:flex-none bb:w-auto">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('members.search')}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </label>

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

      <div className="rounded-bb border border-bb-border bg-bb-content/60 p-3">
        <p className="m-0 mb-2 text-bb-xs font-medium text-bb-muted">
          {t('members.filters.institution')}
        </p>
        <InstitutionCascadePicker
          compact
          depth="country"
          value={institutionId}
          onChange={(inst) => onInstitutionChange?.(inst?.id ?? null)}
        />
        {institutionId ? (
          <button
            type="button"
            className="mt-2 text-bb-xs text-bb-primary hover:underline"
            onClick={() => onInstitutionChange?.(null)}
          >
            {t('members.filters.clearInstitution')}
          </button>
        ) : null}
      </div>

      {total == null && page > 1 ? (
        <p className="m-0 text-bb-xs text-bb-muted">
          {t('members.approxRange', {
            from: (page - 1) * perPage + 1,
            to: page * perPage,
          })}
        </p>
      ) : null}
    </div>
  )
}
