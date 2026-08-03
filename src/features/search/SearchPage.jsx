import { Link, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { IconSearch } from '../../components/icons'
import { SEARCH_TABS, useSearch } from '../../hooks/useSearch'
import { formatTimeSince, stripHtml } from '../activity/utils'

/** Référence: buddypress/search/results-page.php + results-page-content.php */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('s') || params.get('q') || ''
  const [draft, setDraft] = useState(query)
  const [tab, setTab] = useState(params.get('type') || 'all')
  const { results, counts, total, loading } = useSearch(query)

  const title = useMemo(() => {
    if (!query) return 'No results found'
    if (total > 0) return `Showing results for '${query}'`
    return `No results for '${query}'`
  }, [query, total])

  const submit = (e) => {
    e.preventDefault()
    const next = draft.trim()
    if (!next) {
      setParams({})
      return
    }
    const paramsObj = { s: next }
    if (tab !== 'all') paramsObj.type = tab
    setParams(paramsObj)
  }

  const setActiveTab = (id) => {
    setTab(id)
    if (!query) return
    const paramsObj = { s: query }
    if (id !== 'all') paramsObj.type = id
    setParams(paramsObj)
  }

  return (
    <div id="buddypress" className="bp-search-page buddypress-wrap w-full">
      <header className="search-results-header mb-4">
        <h1 className="entry-title m-0 text-bb-xl font-semibold text-bb-heading">{title}</h1>
      </header>

      <form
        onSubmit={submit}
        className="bp-dir-search-form search-form-has-reset relative mb-5 max-w-xl"
        role="search"
      >
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search members, groups, forums..."
          className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content py-2 pl-9 pr-3 text-bb-base outline-none focus:border-bb-primary"
        />
      </form>

      <div className="bp-search-results-wrapper dir-form">
        <nav
          className="search_filters item-list-tabs mb-4 overflow-x-auto"
          role="navigation"
          aria-label="Search filters"
        >
          <ul className="component-navigation search-nav m-0 flex list-none gap-1 p-0">
            {SEARCH_TABS.map((t) => {
              const count = t.id === 'all' ? total : counts[t.id] || 0
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={clsx(
                      'rounded-bb-inner px-3 py-1.5 text-bb-sm font-medium whitespace-nowrap',
                      tab === t.id ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text',
                    )}
                  >
                    {t.label}
                    {query && (
                      <span className="ml-1 opacity-80">({count})</span>
                    )}
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

          {!loading && query && total === 0 && (
            <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
              No results matched your search. Try another keyword.
            </div>
          )}

          {!loading && (!query || total > 0) && (
            <>
              {(tab === 'all' || tab === 'members') && results.members.length > 0 && (
                <ResultSection title="Members" count={counts.members}>
                  {results.members.map((m) => (
                    <ResultRow
                      key={`m-${m.id}`}
                      to={`/members/${m.id}`}
                      title={m.displayName}
                      meta={`@${m.mentionName}${m.location ? ` · ${m.location}` : ''}`}
                      avatarName={m.displayName}
                    />
                  ))}
                </ResultSection>
              )}

              {(tab === 'all' || tab === 'groups') && results.groups.length > 0 && (
                <ResultSection title="Groups" count={counts.groups}>
                  {results.groups.map((g) => (
                    <ResultRow
                      key={`g-${g.id}`}
                      to={`/groups/${g.id}`}
                      title={g.name}
                      meta={`${g.membersCount} members · ${g.status}`}
                      avatarName={g.name}
                    />
                  ))}
                </ResultSection>
              )}

              {(tab === 'all' || tab === 'forums') && results.forums.length > 0 && (
                <ResultSection title="Forums" count={counts.forums}>
                  {results.forums.map((f) => (
                    <ResultRow
                      key={`f-${f.id}`}
                      to={`/forums/${f.id}`}
                      title={f.title}
                      meta={`${f.topicCount} discussions · ${f.replyCount} replies`}
                      avatarName={f.title}
                    />
                  ))}
                </ResultSection>
              )}

              {(tab === 'all' || tab === 'topics') && results.topics.length > 0 && (
                <ResultSection title="Discussions" count={counts.topics}>
                  {results.topics.map((t) => (
                    <ResultRow
                      key={`t-${t.id}`}
                      to={`/forums/${t.forumId}/topics/${t.id}`}
                      title={t.title}
                      meta={`By ${t.authorName} · ${t.replyCount} replies · ${formatTimeSince(t.lastReplyAt)}`}
                      avatarName={t.authorName}
                    />
                  ))}
                </ResultSection>
              )}

              {(tab === 'all' || tab === 'activity') && results.activity.length > 0 && (
                <ResultSection title="Activity" count={counts.activity}>
                  {results.activity.map((a) => (
                    <ResultRow
                      key={`a-${a.id}`}
                      to="/"
                      title={a.userName}
                      meta={stripHtml(a.content)}
                      avatarName={a.userName}
                    />
                  ))}
                </ResultSection>
              )}
            </>
          )}

          {!loading && !query && (
            <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
              Type a keyword above to search across members, groups, forums and discussions.
            </div>
          )}
        </div>
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
