import { useMemo, useState } from 'react'
import { RESOURCE_TYPES } from '../../data/resourcesData'
import { MEMBER_LANGUAGES } from '../../data/membersData'
import { useTranslation } from 'react-i18next'
import { IconBook } from '../../components/icons'
import { Button } from '../../components/ui/Button'

/** Ressources & Guides — remplace le module Courses */
export function ResourcesPage() {
  const { t } = useTranslation()
  const [type, setType] = useState('all')
  const [language, setLanguage] = useState('')
  const [search, setSearch] = useState('')

  const items = useMemo(() => {
    const resources = []
    const q = search.trim().toLowerCase()
    return resources.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      if (language && r.language !== language) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.thematic.toLowerCase().includes(q)
      )
    })
  }, [type, language, search])

  return (
    <div className="w-full">
      <header className="mb-5">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('resources.title')}</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('resources.subtitle')}</p>
      </header>

      <div className="mb-5 flex flex-col gap-3 bb:flex-row bb:flex-wrap bb:items-end">
        <label className="block min-w-[200px] flex-1 text-bb-xs font-medium text-bb-muted">
          <span className="mb-1 block">{t('common.search')}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
          />
        </label>
        <label className="block text-bb-xs font-medium text-bb-muted">
          <span className="mb-1 block">{t('resources.filterType')}</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
          >
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {t(rt.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-bb-xs font-medium text-bb-muted">
          <span className="mb-1 block">{t('members.filters.language')}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-10 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
          >
            <option value="">{t('members.filters.all')}</option>
            {MEMBER_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('resources.empty')}</div>
      )}

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((resource) => (
          <li
            key={resource.id}
            className="flex flex-col rounded-bb border border-bb-border bg-bb-content p-4 shadow-card"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-bb-inner bg-bb-alt text-bb-primary">
              <IconBook />
            </div>
            <div className="mb-1 text-bb-xs font-medium uppercase tracking-wide text-bb-muted">
              {t(`resources.types.${resource.type}`)} · {resource.format}
            </div>
            <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{resource.title}</h2>
            <p className="mt-2 mb-3 flex-1 text-bb-sm text-bb-text">{resource.description}</p>
            <div className="mb-3 flex flex-wrap gap-1">
              <span className="rounded-bb-option bg-[var(--bb-label-background-color)] px-2 py-0.5 text-[11px] text-[var(--bb-label-text-color)]">
                {resource.thematic}
              </span>
              <span className="rounded-bb-option bg-bb-alt px-2 py-0.5 text-[11px] text-bb-muted">
                {MEMBER_LANGUAGES.find((l) => l.code === resource.language)?.label || resource.language}
              </span>
            </div>
            <Button
              as="a"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              size="sm"
              variant="secondary"
            >
              {t('resources.open')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
