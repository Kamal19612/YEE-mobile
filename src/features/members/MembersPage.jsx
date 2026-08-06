import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { useMembers } from '../../hooks/useMembers'
import { MemberCard } from './MemberCard'
import { MembersFilters } from './MembersFilters'

/** Référence: buddypress/members/index.php — annuaire YEE */
export function MembersPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('alphabetical')
  const [country, setCountry] = useState('')
  const [view, setView] = useState('grid')
  const { members, total, loading, error, toggleFriend } = useMembers({
    sort,
    search,
    country,
  })

  return (
    <div id="buddypress" className="buddypress-wrap members-directory-wrapper w-full">
      <div className="members-directory-container">
        <header className="mb-4">
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('members.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('members.subtitle')}</p>
        </header>

        <MembersFilters
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          country={country}
          onCountryChange={setCountry}
          view={view}
          onViewChange={setView}
          total={total}
        />

        <div className="screen-content members-directory-content">
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-bb border border-bb-border bg-bb-content"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
          )}

          {!loading && !error && members.length === 0 && (
            <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
              {t('members.empty')}
            </div>
          )}

          {!loading && !error && members.length > 0 && (
            <ul
              id="members-list"
              className={clsx(
                'bs-members-items bs-item-list item-list m-0 list-none p-0',
                view === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-3',
                view === 'grid' ? 'grid-view' : 'list-view',
              )}
            >
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  view={view}
                  onFriendToggle={toggleFriend}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
