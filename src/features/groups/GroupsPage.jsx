import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconSearch } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { groupSortOptions, groupTypeFilters } from '../../data/groupsData'
import { useGroups } from '../../hooks/useGroups'
import { GroupCard } from './GroupCard'

/** Référence: buddypress/groups/index.php — cohortes AfrEA-YEE */
export function GroupsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const { groups, total, loading, error, toggleMembership, createGroup } = useGroups({
    search,
    sort,
    typeFilter,
  })

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('groups.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('groups.subtitle')}</p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen((v) => !v)}>
          {t('groups.create')}
        </Button>
      </header>

      {createOpen && (
        <form
          className="bb-card mb-5 space-y-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!newName.trim()) return
            const g = await createGroup({ name: newName, description: newDesc })
            setCreateOpen(false)
            setNewName('')
            setNewDesc('')
            navigate(`/groups/${g.id}`)
          }}
        >
          <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{t('groups.createTitle')}</h2>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('groups.namePlaceholder')}
            required
            className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={t('groups.descriptionPlaceholder')}
            rows={3}
            className="w-full rounded-bb-input border border-bb-border px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {t('common.create')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}

      <div className="mb-5 flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
        <div className="bb-item-count text-bb-sm text-bb-text">
          {t(total === 1 ? 'groups.count_one' : 'groups.count_other', { count: total })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block min-w-0 w-full flex-1 sm:min-w-[180px]">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('groups.search')}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
          >
            {groupTypeFilters.map((f) => (
              <option key={f.id} value={f.id}>
                {t(f.labelKey)}
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
                {t(f.labelKey)}
              </option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-bb-input border border-bb-border">
            {['grid', 'list'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-bb-xs font-medium ${
                  view === v ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'
                }`}
              >
                {t(v === 'grid' ? 'members.grid' : 'members.list')}
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
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('groups.empty')}</div>
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
