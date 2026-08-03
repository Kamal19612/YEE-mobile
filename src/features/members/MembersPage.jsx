import { useState } from 'react'
import clsx from 'clsx'
import { useMembers } from '../../hooks/useMembers'
import { MemberCard } from './MemberCard'
import { MembersFilters } from './MembersFilters'

/** Référence: buddypress/members/index.php */
export function MembersPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('grid')
  const { members, total, loading, error, toggleFriend } = useMembers({
    sort,
    typeFilter,
    search,
  })

  return (
    <div id="buddypress" className="buddypress-wrap members-directory-wrapper w-full">
      <div className="members-directory-container">
        <header className="mb-4">
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Members</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">Browse and connect with the community.</p>
        </header>

        <MembersFilters
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          view={view}
          onViewChange={setView}
          total={total}
        />

        <div className="screen-content members-directory-content">
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
          )}

          {!loading && !error && members.length === 0 && (
            <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
              Sorry, no members were found.
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
