import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { deleteAdminAccount, fetchAdminAccounts } from '../../api/admin'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'

const PER_PAGE = 20

const STATUS_FILTERS = ['all', 'active', 'unverified', 'deactivated', 'admins']

function StatusPill({ account, t }) {
  if (account.accountDeleted) {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-bb-danger">
        {t('admin.status.deleted')}
      </span>
    )
  }
  if (account.accountDeactivated) {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-bb-danger">
        {t('admin.status.deactivated')}
      </span>
    )
  }
  if (!account.emailVerified) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        {t('admin.status.unverified')}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-bb-success">
      {t('admin.status.active')}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function AdminAccountsPage() {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [accounts, setAccounts] = useState([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(timer)
  }, [q])

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        const result = await fetchAdminAccounts({
          q: debouncedQ,
          status,
          page,
          perPage: PER_PAGE,
        })
        setAccounts(result.accounts)
        setMeta(result.meta)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setAccounts([])
        setError(err.message || t('admin.loadError'))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [debouncedQ, status, page, t],
  )

  useEffect(() => {
    load({ silent: false })
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  useBackgroundSync(QueryKeys.members, silentReload)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const removedId = pendingDelete.id
    const wasLastOnPage = accounts.length === 1 && page > 1
    setDeleting(true)
    setActionError(null)
    try {
      await deleteAdminAccount(removedId)
      invalidate(QueryKeys.members, { reason: 'deleteAccount', authorId: removedId })
      invalidate(QueryKeys.feed, { reason: 'deleteAccount', authorId: removedId })
      setPendingDelete(null)
      if (wasLastOnPage) {
        setPage((current) => Math.max(1, current - 1))
      } else {
        await load({ silent: true })
      }
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="w-full">
      <header className="mb-5">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-bb-muted">
          {t('admin.section')}
        </p>
        <h1 className="m-0 mt-1 text-bb-xl font-semibold text-bb-heading">{t('admin.accountsTitle')}</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('admin.accountsSubtitle')}</p>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          placeholder={t('admin.searchPlaceholder')}
          className="w-full max-w-md rounded-bb border border-bb-border bg-bb-content px-3 py-2 text-bb-sm text-bb-heading outline-none focus:border-bb-primary"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setStatus(id)
                setPage(1)
              }}
              className={clsx(
                'rounded-full px-3 py-1.5 text-bb-sm font-medium transition-colors',
                status === id
                  ? 'bg-bb-primary text-white'
                  : 'bg-bb-alt text-bb-heading hover:bg-bb-border/40',
              )}
            >
              {t(`admin.filters.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bb-card p-4 text-bb-sm text-bb-danger" role="alert">
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-bb border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-bb-danger" role="alert">
          {actionError}
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('admin.empty')}</div>
      )}

      {!loading && !error && accounts.length > 0 && (
        <>
          <ul className="m-0 list-none space-y-3 p-0 md:hidden">
            {accounts.map((account) => (
              <li key={account.id} className="bb-card p-3">
                <div className="flex items-start gap-3">
                  <Avatar name={account.displayName} src={account.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-semibold text-bb-heading">{account.displayName}</span>
                      {account.siteAdmin && (
                        <span className="rounded-full bg-bb-primary/10 px-2 py-0.5 text-[11px] font-semibold text-bb-primary">
                          {t('admin.status.admin')}
                        </span>
                      )}
                    </div>
                    <p className="m-0 break-all text-bb-sm text-bb-muted">
                      @{account.mentionName || '—'} · {account.email}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusPill account={account} t={t} />
                      <span className="text-bb-xs text-bb-muted">{formatDate(account.createdAt)}</span>
                    </div>
                    <p className="m-0 mt-1 text-bb-xs text-bb-text">
                      {t('admin.table.statsValues', {
                        posts: account.postsCount ?? 0,
                        followers: account.followersCount ?? 0,
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button as={Link} to={`/admin/accounts/${account.id}`} size="sm" variant="outline" className="min-h-10 flex-1">
                    {t('admin.open')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      deleting ||
                      account.accountDeleted ||
                      String(me?.id) === String(account.id)
                    }
                    className="min-h-10 flex-1 border-[#b01b22] text-[var(--bb-danger-color)] hover:border-[#8f161c] hover:bg-red-50 hover:text-[#8f161c]"
                    onClick={() => {
                      setActionError(null)
                      setPendingDelete(account)
                    }}
                  >
                    {account.accountDeleted ? t('admin.actions.deleted') : t('admin.actions.delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-bb border border-bb-border bg-bb-content md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-bb-sm">
              <thead>
                <tr className="border-b border-bb-border bg-bb-alt/60 text-[11px] uppercase tracking-wide text-bb-muted">
                  <th className="px-4 py-3 font-semibold">{t('admin.table.account')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.stats')}</th>
                  <th className="px-4 py-3 font-semibold">{t('admin.table.created')}</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-bb-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={account.displayName} src={account.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-bb-heading">{account.displayName}</span>
                            {account.siteAdmin && (
                              <span className="rounded-full bg-bb-primary/10 px-2 py-0.5 text-[11px] font-semibold text-bb-primary">
                                {t('admin.status.admin')}
                              </span>
                            )}
                          </div>
                          <p className="m-0 truncate text-bb-muted">
                            @{account.mentionName || '—'} · {account.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill account={account} t={t} />
                    </td>
                    <td className="px-4 py-3 text-bb-text">
                      {t('admin.table.statsValues', {
                        posts: account.postsCount ?? 0,
                        followers: account.followersCount ?? 0,
                      })}
                    </td>
                    <td className="px-4 py-3 text-bb-muted">{formatDate(account.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <Button as={Link} to={`/admin/accounts/${account.id}`} size="sm" variant="outline">
                          {t('admin.open')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            deleting ||
                            account.accountDeleted ||
                            String(me?.id) === String(account.id)
                          }
                          title={
                            String(me?.id) === String(account.id)
                              ? t('admin.actions.deleteSelfHelp')
                              : account.accountDeleted
                                ? t('admin.actions.deleteDoneHelp')
                                : undefined
                          }
                          className="border-[#b01b22] text-[var(--bb-danger-color)] hover:border-[#8f161c] hover:bg-red-50 hover:text-[#8f161c]"
                          onClick={() => {
                            setActionError(null)
                            setPendingDelete(account)
                          }}
                        >
                          {account.accountDeleted ? t('admin.actions.deleted') : t('admin.actions.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            className="mt-5 flex flex-wrap items-center justify-center gap-3"
            aria-label={t('admin.pagination')}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!meta.hasPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('admin.prevPage')}
            </Button>
            <span className="text-bb-sm text-bb-text">
              {t('admin.pageOf', { page, total: meta.totalPages || 1 })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!meta.hasNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('admin.nextPage')}
            </Button>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('admin.actions.deleteConfirmTitle')}
        body={t('admin.actions.deleteConfirmBody', { name: pendingDelete?.displayName || '' })}
        confirmLabel={t('admin.actions.delete')}
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
