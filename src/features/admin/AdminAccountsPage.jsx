import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { deleteAdminAccount, fetchAdminAccounts, verifyAdminAccount } from '../../api/admin'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { IconSearch, IconUsers } from '../../components/icons'
import { useAuth } from '../../hooks/useAuth'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'

const PER_PAGE = 20

const STATUS_FILTERS = [
  'all',
  'pending_verify',
  'awaiting_password',
  'active',
  'unverified',
  'deactivated',
  'admins',
]

function canInviteActivation(account) {
  const status = account?.accountStatus
  return (
    !account?.accountDeleted &&
    !account?.accountDeactivated &&
    (status === 'A_VERIFIER' || status === 'VERIFIE')
  )
}

function StatusPill({ account, t }) {
  if (account.accountDeleted) {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-danger-tint text-afr-danger">
        {t('admin.status.deleted')}
      </span>
    )
  }
  if (account.accountDeactivated || account.accountStatus === 'DESACTIVE') {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-danger-tint text-afr-danger">
        {t('admin.status.deactivated')}
      </span>
    )
  }
  if (account.accountStatus === 'A_VERIFIER') {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-gold-tint text-afr-gold-text">
        {t('admin.status.pendingVerify')}
      </span>
    )
  }
  if (account.accountStatus === 'VERIFIE') {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-gold-tint text-afr-gold-text">
        {t('admin.status.awaitingPassword')}
      </span>
    )
  }
  if (!account.emailVerified) {
    return (
      <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-gold-tint text-afr-gold-text">
        {t('admin.status.unverified')}
      </span>
    )
  }
  return (
    <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-success-tint text-afr-success">
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
  const [verifyingId, setVerifyingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionInfo, setActionInfo] = useState(null)

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
    setActionInfo(null)
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

  const inviteActivation = async (account) => {
    if (!account?.id) return
    setVerifyingId(account.id)
    setActionError(null)
    setActionInfo(null)
    try {
      const result = await verifyAdminAccount(account.id)
      const link = Array.isArray(result?.activationLinks) ? result.activationLinks[0]?.activationUrl : null
      setActionInfo(
        link
          ? t('admin.actions.verifyInviteDevLink', { url: link })
          : t('admin.actions.verifyInviteSent', { name: account.displayName || account.email }),
      )
      await load({ silent: true })
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
    } finally {
      setVerifyingId(null)
    }
  }

  return (
    <div className="w-full">
      <header className="mb-6">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-bb-muted">
          {t('admin.section')}
        </p>
        <h1 className="m-0 mt-1.5 font-display text-[26px] font-extrabold leading-tight text-bb-heading bb:text-[30px]">{t('admin.accountsTitle')}</h1>
        <p className="m-0 mt-1.5 text-bb-base text-bb-muted">{t('admin.accountsSubtitle')}</p>
      </header>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-md">
          <IconSearch className="pointer-events-none absolute left-[18px] top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-bb-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder={t('admin.searchPlaceholder')}
            className="h-12 w-full rounded-full border border-bb-border bg-bb-content pl-12 pr-[18px] text-bb-base text-bb-heading outline-none transition-colors placeholder:text-afr-slate focus:border-bb-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {STATUS_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setStatus(id)
                setPage(1)
              }}
              className={clsx(
                'inline-flex h-11 items-center rounded-full border px-[18px] text-[14px] transition-colors',
                status === id
                  ? 'border-bb-primary bg-bb-primary font-bold text-white'
                  : 'border-bb-border bg-bb-content font-semibold text-bb-heading hover:border-bb-primary',
              )}
            >
              {t(`admin.filters.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-afr-list bg-afr-line" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger" role="alert">
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger" role="alert">
          {actionError}
        </div>
      )}

      {actionInfo && (
        <div className="mb-4 break-all rounded-bb-input bg-afr-success-tint px-4 py-3 text-bb-sm font-medium text-afr-success" role="status">
          {actionInfo}
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="bb-card flex flex-col items-center gap-2.5 px-6 py-8 text-center text-bb-sm text-bb-muted">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-afr-primary-tint text-bb-primary">
            <IconUsers className="h-6 w-6" />
          </span>
          {t('admin.empty')}
        </div>
      )}

      {!loading && !error && accounts.length > 0 && (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {accounts.map((account) => (
              <li key={account.id} className="rounded-afr-list border border-bb-border bg-bb-content p-[18px]">
                <div className="flex items-start gap-3.5">
                  <Avatar name={account.displayName} src={account.avatarUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-bb-md font-bold text-bb-heading">{account.displayName}</span>
                      {account.siteAdmin && (
                        <span className="inline-flex h-[26px] items-center rounded-full bg-afr-primary-tint px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-afr-primary">
                          {t('admin.status.admin')}
                        </span>
                      )}
                    </div>
                    <p className="m-0 mt-0.5 break-all text-bb-sm text-bb-muted">
                      @{account.mentionName || '—'} · {account.email}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StatusPill account={account} t={t} />
                      <span className="text-bb-xs text-bb-muted">{formatDate(account.createdAt)}</span>
                    </div>
                    <p className="m-0 mt-2 text-bb-sm text-bb-text">
                      {t('admin.table.statsValues', {
                        posts: account.postsCount ?? 0,
                        followers: account.followersCount ?? 0,
                      })}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5 border-t border-bb-border pt-4">
                  <Button as={Link} to={`/admin/accounts/${account.id}`} size="sm" variant="secondary" className="flex-1">
                    {t('admin.open')}
                  </Button>
                  {canInviteActivation(account) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      disabled={Boolean(verifyingId) || deleting}
                      onClick={() => inviteActivation(account)}
                    >
                      {verifyingId === account.id
                        ? t('admin.actions.verifyInviteSending')
                        : account.accountStatus === 'VERIFIE'
                          ? t('admin.actions.resendInvite')
                          : t('admin.actions.verifyInvite')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={
                      deleting ||
                      Boolean(verifyingId) ||
                      account.accountDeleted ||
                      String(me?.id) === String(account.id)
                    }
                    className="flex-1"
                    onClick={() => {
                      setActionError(null)
                      setActionInfo(null)
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
                <tr className="border-b border-bb-border bg-afr-ground text-[11px] uppercase tracking-[0.1em] text-bb-muted">
                  <th className="px-4 py-3.5 font-bold">{t('admin.table.account')}</th>
                  <th className="px-4 py-3.5 font-bold">{t('admin.table.status')}</th>
                  <th className="px-4 py-3.5 font-bold">{t('admin.table.stats')}</th>
                  <th className="px-4 py-3.5 font-bold">{t('admin.table.created')}</th>
                  <th className="px-4 py-3.5 font-bold" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-bb-border last:border-0">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3.5">
                        <Avatar name={account.displayName} src={account.avatarUrl} size="md" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-bb-base font-bold text-bb-heading">{account.displayName}</span>
                            {account.siteAdmin && (
                              <span className="inline-flex h-[26px] items-center rounded-full bg-afr-primary-tint px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-afr-primary">
                                {t('admin.status.admin')}
                              </span>
                            )}
                          </div>
                          <p className="m-0 mt-0.5 truncate text-bb-muted">
                            @{account.mentionName || '—'} · {account.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill account={account} t={t} />
                    </td>
                    <td className="px-4 py-4 text-bb-text">
                      {t('admin.table.statsValues', {
                        posts: account.postsCount ?? 0,
                        followers: account.followersCount ?? 0,
                      })}
                    </td>
                    <td className="px-4 py-4 text-bb-muted">{formatDate(account.createdAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-2 whitespace-nowrap 2xl:flex-row 2xl:justify-end">
                        <Button as={Link} to={`/admin/accounts/${account.id}`} size="sm" variant="secondary">
                          {t('admin.open')}
                        </Button>
                        {canInviteActivation(account) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={Boolean(verifyingId) || deleting}
                            onClick={() => inviteActivation(account)}
                          >
                            {verifyingId === account.id
                              ? t('admin.actions.verifyInviteSending')
                              : account.accountStatus === 'VERIFIE'
                                ? t('admin.actions.resendInvite')
                                : t('admin.actions.verifyInvite')}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={
                            deleting ||
                            Boolean(verifyingId) ||
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
                          onClick={() => {
                            setActionError(null)
                            setActionInfo(null)
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
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
            aria-label={t('admin.pagination')}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!meta.hasPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('admin.prevPage')}
            </Button>
            <span className="px-1 text-bb-sm font-semibold text-bb-heading">
              {t('admin.pageOf', { page, total: meta.totalPages || 1 })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
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
