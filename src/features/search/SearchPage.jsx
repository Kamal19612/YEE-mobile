import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { IconSearch } from '../../components/icons'
import { STORY_COUNTRIES, STORY_THEMATICS } from '../../data/activityData'
import { MEMBER_LANGUAGES } from '../../data/membersData'
import { SEARCH_TABS, useSearch } from '../../hooks/useSearch'
import { stripHtml } from '../activity/utils'

/** Recherche globale multi-critères — contenu, langue, pays, thématique */
export function SearchPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const query = params.get('s') || params.get('q') || ''
  const [draft, setDraft] = useState(query)
  const [tab, setTab] = useState(params.get('type') || 'all')
  const [country, setCountry] = useState(params.get('country') || '')
  const [language, setLanguage] = useState(params.get('language') || '')
  const [thematic, setThematic] = useState(params.get('thematic') || '')
  const filters = { country, language, thematic }
  const { results, counts, total, loading } = useSearch(query, filters)
  const hasCriteria = Boolean(query || country || language || thematic)

  const title = useMemo(() => {
    if (!hasCriteria) return t('search.prompt')
    if (total > 0) return t('search.showing', { query: query || '…', count: total })
    return t('search.none', { query: query || '…' })
  }, [hasCriteria, query, total, t])

  const applyParams = (overrides = {}) => {
    const next = {
      ...(overrides.s !== undefined ? { s: overrides.s } : query ? { s: query } : {}),
      ...(overrides.type || tab !== 'all' ? { type: overrides.type || tab } : {}),
      ...(overrides.country !== undefined
        ? overrides.country
          ? { country: overrides.country }
          : {}
        : country
          ? { country }
          : {}),
      ...(overrides.language !== undefined
        ? overrides.language
          ? { language: overrides.language }
          : {}
        : language
          ? { language }
          : {}),
      ...(overrides.thematic !== undefined
        ? overrides.thematic
          ? { thematic: overrides.thematic }
          : {}
        : thematic
          ? { thematic }
          : {}),
    }
    if (next.type === 'all') delete next.type
    setParams(next)
  }

  const submit = (e) => {
    e.preventDefault()
    applyParams({ s: draft.trim() })
  }

  return (
    <div id="buddypress" className="bp-search-page buddypress-wrap w-full">
      <header className="search-results-header mb-4">
        <h1 className="entry-title m-0 break-words text-bb-lg font-semibold text-bb-heading sm:text-bb-xl">{title}</h1>
      </header>

      <form onSubmit={submit} className="relative mb-3 max-w-xl" role="search">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('search.placeholder')}
          className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content py-2 pl-9 pr-3 text-bb-base outline-none focus:border-bb-primary"
        />
      </form>

      <div className="mb-5 grid max-w-3xl gap-2 sm:grid-cols-3">
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            applyParams({ country: e.target.value, s: draft.trim() || query })
          }}
          className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
        >
          <option value="">{t('members.filters.country')} — {t('members.filters.all')}</option>
          {STORY_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value)
            applyParams({ language: e.target.value, s: draft.trim() || query })
          }}
          className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
        >
          <option value="">{t('members.filters.language')} — {t('members.filters.all')}</option>
          {MEMBER_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <select
          value={thematic}
          onChange={(e) => {
            setThematic(e.target.value)
            applyParams({ thematic: e.target.value, s: draft.trim() || query })
          }}
          className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
        >
          <option value="">{t('members.filters.thematic')} — {t('members.filters.all')}</option>
          {STORY_THEMATICS.map((th) => (
            <option key={th} value={th}>
              {th}
            </option>
          ))}
        </select>
      </div>

      <nav className="mb-4" aria-label={t('nav.search')}>
        <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
          {SEARCH_TABS.map((tabItem) => {
            const count = tabItem.id === 'all' ? total : counts[tabItem.id] || 0
            return (
              <li key={tabItem.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTab(tabItem.id)
                    applyParams({ type: tabItem.id, s: query })
                  }}
                  className={clsx(
                    'rounded-bb-inner px-3 py-2 text-bb-sm font-medium whitespace-nowrap',
                    tab === tabItem.id ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text',
                  )}
                >
                  {t(tabItem.labelKey)}
                  {hasCriteria && <span className="ml-1 opacity-80">({count})</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="search_results space-y-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
            ))}
          </div>
        )}

        {!loading && hasCriteria && total === 0 && (
          <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('search.empty')}</div>
        )}

        {!loading && hasCriteria && total > 0 && (
          <>
            {(tab === 'all' || tab === 'activity') && results.activity.length > 0 && (
              <ResultSection title={t('search.tabs.stories')} count={counts.activity}>
                {results.activity.map((a) => (
                  <ResultRow
                    key={`a-${a.id}`}
                    to="/"
                    title={a.title || a.userName}
                    meta={stripHtml(a.content)}
                    avatarName={a.anonymous ? '?' : a.userName}
                  />
                ))}
              </ResultSection>
            )}

            {(tab === 'all' || tab === 'members') && results.members.length > 0 && (
              <ResultSection title={t('search.tabs.members')} count={counts.members}>
                {results.members.map((m) => (
                  <ResultRow
                    key={`m-${m.id}`}
                    to={`/members/${m.id}`}
                    title={m.displayName}
                    meta={[m.country, m.thematic].filter(Boolean).join(' · ')}
                    avatarName={m.displayName}
                  />
                ))}
              </ResultSection>
            )}

            {(tab === 'all' || tab === 'groups') && results.groups.length > 0 && (
              <ResultSection title={t('search.tabs.cohorts')} count={counts.groups}>
                {results.groups.map((g) => (
                  <ResultRow
                    key={`g-${g.id}`}
                    to={`/groups/${g.id}`}
                    title={g.name}
                    meta={`${g.membersCount} · ${g.status}`}
                    avatarName={g.name}
                  />
                ))}
              </ResultSection>
            )}
          </>
        )}

        {!loading && !hasCriteria && (
          <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('search.hint')}</div>
        )}
      </div>
    </div>
  )
}

function ResultSection({ title, count, children }) {
  return (
    <section className="bb-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-bb-border px-4 py-3">
        <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{title}</h2>
        <span className="text-bb-xs text-bb-muted">{count}</span>
      </header>
      <ul className="m-0 list-none divide-y divide-bb-border p-0">{children}</ul>
    </section>
  )
}

function ResultRow({ to, title, meta, avatarName }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-bb-alt">
        <Avatar name={avatarName} size="md" />
        <div className="min-w-0">
          <div className="truncate font-medium text-bb-heading">{title}</div>
          <div className="truncate text-bb-sm text-bb-muted">{meta}</div>
        </div>
      </Link>
    </li>
  )
}
