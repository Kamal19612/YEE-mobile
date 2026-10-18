import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useUsersDirectory } from '../../hooks/useUsersDirectory'
import { MemberCard } from './MemberCard'
import { MembersFilters } from './MembersFilters'

const PER_PAGE = 12

/** Annuaire public — GET /users (App API). */
export function MembersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [institutionId, setInstitutionId] = useState(null)
  const [page, setPage] = useState(1)
  const [view, setView] = useState('grid')
  const [unfollowTarget, setUnfollowTarget] = useState(null)
  const [followBusy, setFollowBusy] = useState(false)

  const { users, meta, loading, error, hasNext, hasPrev, total, toggleFollow } = useUsersDirectory({
    search,
    institutionId,
    page,
    perPage: PER_PAGE,
  })

  const handleSearchChange = (value) => {
    setSearch(value)
    setPage(1)
  }

  const handleInstitutionChange = (id) => {
    setInstitutionId(id)
    setPage(1)
  }

  return (
    <div id="buddypress" className="buddypress-wrap members-directory-wrapper w-full">
      <div className="members-directory-container">
        <header className="mb-4">
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('members.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('members.subtitle')}</p>
        </header>

        <MembersFilters
          search={search}
          onSearchChange={handleSearchChange}
          institutionId={institutionId}
          onInstitutionChange={handleInstitutionChange}
          view={view}
          onViewChange={setView}
          total={total}
          page={page}
          perPage={PER_PAGE}
        />

        <div className="screen-content members-directory-content">
          {loading && (
            <div className="grid grid-cols-1 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,14rem))]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-bb border border-bb-border bg-bb-content"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
          )}

          {!loading && !error && users.length === 0 && (
            <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
              {t('members.empty')}
            </div>
          )}

          {!loading && !error && users.length > 0 && (
            <>
              <ul
                id="members-list"
                className={clsx(
                  'bs-members-items bs-item-list item-list m-0 list-none p-0',
                  view === 'grid'
                    ? 'grid grid-cols-1 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,14rem))]'
                    : 'flex flex-col gap-3',
                  view === 'grid' ? 'grid-view' : 'list-view',
                )}
              >
                {users.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={
                      user && String(user.id) === String(member.id)
                        ? { ...member, friendshipStatus: 'self' }
                        : member
                    }
                    view={view}
                    variant="directory"
                    onFriendToggle={
                      user
                        ? (id) => {
                            const target = users.find((m) => String(m.id) === String(id))
                            if (target?.isFollowing || target?.friendshipStatus === 'is_friend') {
                              setUnfollowTarget(target)
                              return
                            }
                            toggleFollow(id)
                          }
                        : undefined
                    }
                  />
                ))}
              </ul>

              <nav
                className="mt-6 flex flex-wrap items-center justify-center gap-3"
                aria-label={t('members.pagination')}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!hasPrev || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('members.prevPage')}
                </Button>
                <span className="text-bb-sm text-bb-text">
                  {meta.totalPages != null
                    ? t('members.pageOf', { page, total: meta.totalPages })
                    : t('members.pageLabel', { page })}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('members.nextPage')}
                </Button>
              </nav>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(unfollowTarget)}
        title={t('members.unfollowConfirmTitle')}
        body={t('members.unfollowConfirmBody', { name: unfollowTarget?.displayName || '' })}
        confirmLabel={t('members.disconnect')}
        confirming={followBusy}
        onCancel={() => {
          if (!followBusy) setUnfollowTarget(null)
        }}
        onConfirm={async () => {
          if (!unfollowTarget) return
          setFollowBusy(true)
          try {
            await toggleFollow(unfollowTarget.id)
            setUnfollowTarget(null)
          } finally {
            setFollowBusy(false)
          }
        }}
      />
    </div>
  )
}
