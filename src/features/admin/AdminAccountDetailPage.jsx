import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  deleteAdminAccount,
  fetchAdminAccount,
  fetchAdminAccountActivity,
  patchAdminAccount,
  revokeAdminAccountSessions,
} from '../../api/admin'
import { deleteAdminConversation, fetchAdminUserConversations } from '../../api/messages'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'

const ACTIVITY_FILTERS = [
  { id: 'all', types: undefined },
  { id: 'post', types: 'post' },
  { id: 'like', types: 'like' },
  { id: 'comment', types: 'comment' },
  { id: 'follow', types: 'follow' },
  { id: 'group', types: 'group' },
  { id: 'institution', types: 'institution' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function StatusPills({ account, t }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {account.siteAdmin && (
        <span className="rounded-full bg-bb-primary/10 px-2 py-0.5 text-[11px] font-semibold text-bb-primary">
          {t('admin.status.admin')}
        </span>
      )}
      {account.accountDeleted ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-bb-danger">
          {t('admin.status.deleted')}
        </span>
      ) : account.accountDeactivated ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-bb-danger">
          {t('admin.status.deactivated')}
        </span>
      ) : account.emailVerified ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-bb-success">
          {t('admin.status.active')}
        </span>
      ) : (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          {t('admin.status.unverified')}
        </span>
      )}
    </div>
  )
}

export function AdminAccountDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useParams()
  const { user: me } = useAuth()
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [tab, setTab] = useState('overview')
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [deleteConvId, setDeleteConvId] = useState(null)
  const [activityFilter, setActivityFilter] = useState('all')
  const [activity, setActivity] = useState([])
  const [activityMeta, setActivityMeta] = useState({})
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const loadAccount = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminAccount(userId)
      setAccount(data)
    } catch (err) {
      setAccount(null)
      setError(err.message || t('admin.loadError'))
    } finally {
      setLoading(false)
    }
  }, [userId, t])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  const loadActivity = useCallback(
    async ({ append = false, before } = {}) => {
      setActivityLoading(true)
      setActivityError(null)
      try {
        const filter = ACTIVITY_FILTERS.find((f) => f.id === activityFilter)
        const result = await fetchAdminAccountActivity(userId, {
          types: filter?.types,
          before,
          limit: 40,
        })
        setActivity((prev) => (append ? [...prev, ...result.items] : result.items))
        setActivityMeta(result.meta || {})
      } catch (err) {
        if (!append) setActivity([])
        setActivityError(err.message || t('admin.activityLoadError'))
      } finally {
        setActivityLoading(false)
      }
    },
    [userId, activityFilter, t],
  )

  useEffect(() => {
    if (tab !== 'activity') return undefined
    loadActivity({ append: false })
    return undefined
  }, [tab, loadActivity])

  useEffect(() => {
    if (tab !== 'conversations') return undefined
    let cancelled = false
    setConversationsLoading(true)
    fetchAdminUserConversations(userId)
      .then((result) => {
        if (!cancelled) setConversations(result.threads)
      })
      .catch(() => {
        if (!cancelled) setConversations([])
      })
      .finally(() => {
        if (!cancelled) setConversationsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, userId])

  const onAccountSync = useCallback(
    async (detail) => {
      if (detail?.reason === 'like' || detail?.reason === 'comment' || detail?.reason === 'removeComment') {
        return
      }
      if (detail?.reason === 'deleteAccount' && String(detail.authorId) === String(userId)) {
        try {
          const data = await fetchAdminAccount(userId)
          setAccount(data)
        } catch {
          /* garder la fiche actuelle */
        }
        if (tab === 'activity') {
          await loadActivity({ append: false })
        }
        return
      }
      if (detail?.reason === 'deletePost' && detail.postId) {
        const sameAuthor =
          !detail.authorId || String(detail.authorId) === String(userId)
        if (sameAuthor) {
          setActivity((prev) =>
            prev.filter(
              (item) => !(item.type === 'post' && String(item.id) === String(detail.postId)),
            ),
          )
          setAccount((prev) =>
            prev
              ? { ...prev, postsCount: Math.max(0, (prev.postsCount || 0) - 1) }
              : prev,
          )
        }
      }
      try {
        const data = await fetchAdminAccount(userId)
        setAccount(data)
      } catch {
        /* garder la fiche actuelle */
      }
      if (tab === 'activity') {
        await loadActivity({ append: false })
      }
    },
    [userId, tab, loadActivity],
  )

  useBackgroundSync([QueryKeys.members, QueryKeys.feed], onAccountSync, {
    enabled: Boolean(userId),
    focus: true,
  })

  const runAction = async (fn) => {
    setActionBusy(true)
    setActionError(null)
    try {
      await fn()
      await loadAccount()
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
    } finally {
      setActionBusy(false)
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
  }

  if (error || !account) {
    return (
      <div className="space-y-3">
        <Link to="/admin/accounts" className="text-bb-sm font-medium text-bb-primary hover:underline">
          ← {t('admin.backToList')}
        </Link>
        <div className="bb-card p-4 text-bb-sm text-bb-danger" role="alert">
          {error || t('admin.notFound')}
        </div>
      </div>
    )
  }

  const isSelf = String(me?.id) === String(account.id)
  const locked = Boolean(account.accountDeleted)

  const confirmDelete = async () => {
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteAdminAccount(account.id)
      invalidate(QueryKeys.members, { reason: 'deleteAccount', authorId: account.id })
      invalidate(QueryKeys.feed, { reason: 'deleteAccount', authorId: account.id })
      navigate('/admin/accounts', { replace: true })
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
      setDeleteOpen(false)
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="w-full">
      <Link to="/admin/accounts" className="text-bb-sm font-medium text-bb-primary hover:underline">
        ← {t('admin.backToList')}
      </Link>

      <header className="mt-3 mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Avatar name={account.displayName} src={account.avatarUrl} size="xl" />
          <div className="min-w-0">
            <h1 className="m-0 break-words text-bb-lg font-semibold text-bb-heading sm:text-bb-xl">{account.displayName}</h1>
            <p className="m-0 mt-1 break-all text-bb-sm text-bb-muted">
              @{account.mentionName || '—'} · {account.email}
            </p>
            <div className="mt-2">
              <StatusPills account={account} t={t} />
            </div>
          </div>
        </div>
        <Button as={Link} to={`/members/${account.id}`} size="sm" variant="outline">
          {t('admin.viewPublicProfile')}
        </Button>
      </header>

      <div className="bb-scroll-tabs mb-4 gap-1 border-b border-bb-border">
        {['overview', 'activity', 'conversations', 'actions'].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-bb-sm font-medium transition-colors',
              tab === id
                ? 'border-bb-primary text-bb-primary'
                : 'border-transparent text-bb-muted hover:text-bb-heading',
            )}
          >
            {t(`admin.tabs.${id}`)}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 rounded-bb border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-bb-danger" role="alert">
          {actionError}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="bb-card p-4">
            <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">{t('admin.overview.identity')}</h2>
            <dl className="m-0 grid gap-2 text-bb-sm">
              <div>
                <dt className="text-bb-muted">{t('admin.overview.profession')}</dt>
                <dd className="m-0 text-bb-heading">{account.profession || '—'}</dd>
              </div>
              <div>
                <dt className="text-bb-muted">{t('admin.overview.organization')}</dt>
                <dd className="m-0 text-bb-heading">{account.organization || '—'}</dd>
              </div>
              <div>
                <dt className="text-bb-muted">{t('admin.overview.location')}</dt>
                <dd className="m-0 text-bb-heading">{account.location || '—'}</dd>
              </div>
              <div>
                <dt className="text-bb-muted">{t('admin.overview.bio')}</dt>
                <dd className="m-0 whitespace-pre-wrap text-bb-heading">{account.bio || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="bb-card p-4">
            <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">{t('admin.overview.account')}</h2>
            <dl className="m-0 grid gap-2 text-bb-sm">
              <div>
                <dt className="text-bb-muted">{t('admin.overview.created')}</dt>
                <dd className="m-0 text-bb-heading">{formatDate(account.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-bb-muted">{t('admin.overview.updated')}</dt>
                <dd className="m-0 text-bb-heading">{formatDate(account.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-bb-muted">{t('admin.overview.deactivatedAt')}</dt>
                <dd className="m-0 text-bb-heading">{formatDate(account.deactivatedAt)}</dd>
              </div>
              <div>
                <dt className="text-bb-muted">{t('admin.overview.stats')}</dt>
                <dd className="m-0 text-bb-heading">
                  {t('admin.table.statsValues', {
                    posts: account.postsCount ?? 0,
                    followers: account.followersCount ?? 0,
                  })}{' '}
                  · {t('admin.overview.following', { count: account.followingCount ?? 0 })}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bb-card p-4 lg:col-span-2">
            <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">
              {t('admin.overview.sessions', { count: account.activeSessions?.length || 0 })}
            </h2>
            {!account.activeSessions?.length ? (
              <p className="m-0 text-bb-sm text-bb-muted">{t('admin.overview.noSessions')}</p>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {account.activeSessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-bb-inner border border-bb-border px-3 py-2 text-bb-sm"
                  >
                    <p className="m-0 font-medium text-bb-heading">
                      {session.ipAddress || t('admin.overview.unknownIp')}
                      {session.rememberMe ? ` · ${t('admin.overview.rememberMe')}` : ''}
                    </p>
                    <p className="m-0 mt-0.5 text-bb-muted">{session.userAgent || '—'}</p>
                    <p className="m-0 mt-0.5 text-[11px] text-bb-muted">
                      {formatDate(session.createdAt)} → {formatDate(session.expiresAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'activity' && (
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ACTIVITY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActivityFilter(filter.id)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-bb-sm font-medium transition-colors',
                  activityFilter === filter.id
                    ? 'bg-bb-primary text-white'
                    : 'bg-bb-alt text-bb-heading hover:bg-bb-border/40',
                )}
              >
                {t(`admin.activityFilters.${filter.id}`)}
              </button>
            ))}
          </div>

          {activityError && (
            <div className="mb-3 bb-card p-3 text-bb-sm text-bb-danger" role="alert">
              {activityError}
            </div>
          )}

          {activityLoading && activity.length === 0 && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
              ))}
            </div>
          )}

          {!activityLoading && !activityError && activity.length === 0 && (
            <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('admin.activityEmpty')}</div>
          )}

          {activity.length > 0 && (
            <ol className="m-0 list-none space-y-2 p-0">
              {activity.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="rounded-bb border border-bb-border bg-bb-content px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-bb-alt px-2 py-0.5 text-[11px] font-semibold uppercase text-bb-heading">
                      {t(`admin.activityTypes.${item.type}`, { defaultValue: item.type })}
                    </span>
                    <span className="text-[11px] text-bb-muted">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="m-0 mt-1.5 text-bb-sm text-bb-heading">{item.summary}</p>
                  {item.type === 'institution' && item.meta?.institutionId ? (
                    <Link
                      to={`/institutions/${item.meta.institutionId}`}
                      className="mt-1 inline-block text-bb-xs text-bb-primary hover:underline"
                    >
                      {item.meta.institutionName || t('institutions.title')}
                    </Link>
                  ) : null}
                  {item.type === 'group' && item.meta?.groupId ? (
                    <Link
                      to={`/groups/${item.meta.groupId}`}
                      className="mt-1 inline-block text-bb-xs text-bb-primary hover:underline"
                    >
                      {item.meta.groupName || t('groups.title')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          {activityMeta.hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={activityLoading}
                onClick={() => loadActivity({ append: true, before: activityMeta.nextBefore })}
              >
                {t('admin.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === 'conversations' && (
        <div className="space-y-3">
          {conversationsLoading && <p className="text-bb-sm text-bb-muted">{t('admin.conversations.loading')}</p>}
          {!conversationsLoading && !conversations.length && (
            <p className="text-bb-sm text-bb-muted">{t('admin.conversations.empty')}</p>
          )}
          {conversations.map((thread) => (
            <section
              key={thread.id}
              className="bb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h2 className="m-0 truncate text-bb-base font-semibold text-bb-heading">
                  {thread.isGroup ? thread.subject : thread.participants.map((p) => p.displayName).join(', ')}
                </h2>
                <p className="m-0 mt-1 truncate text-bb-sm text-bb-muted">
                  {thread.lastMessage?.content?.replace(/<[^>]+>/g, '') || t('admin.conversations.noPreview')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button as={Link} to={`/messages/${thread.id}`} size="sm" variant="outline">
                  {t('admin.conversations.open')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-[#b01b22] text-[var(--bb-danger-color)]"
                  onClick={() => setDeleteConvId(thread.id)}
                >
                  {t('admin.conversations.delete')}
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'actions' && (
        <div className="space-y-3">
          <section className="bb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-bb-base font-semibold text-bb-heading">
                {account.accountDeactivated ? t('admin.actions.reactivateTitle') : t('admin.actions.deactivateTitle')}
              </h2>
              <p className="m-0 mt-1 text-bb-sm text-bb-muted">
                {account.accountDeactivated
                  ? t('admin.actions.reactivateHelp')
                  : t('admin.actions.deactivateHelp')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={account.accountDeactivated ? 'primary' : 'outline'}
              disabled={actionBusy || locked || (isSelf && !account.accountDeactivated)}
              onClick={() =>
                runAction(() =>
                  patchAdminAccount(account.id, { accountDeactivated: !account.accountDeactivated }),
                )
              }
            >
              {account.accountDeactivated ? t('admin.actions.reactivate') : t('admin.actions.deactivate')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('admin.actions.verifyTitle')}</h2>
              <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('admin.actions.verifyHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionBusy || locked || account.emailVerified}
              onClick={() => runAction(() => patchAdminAccount(account.id, { emailVerified: true }))}
            >
              {account.emailVerified ? t('admin.actions.alreadyVerified') : t('admin.actions.verify')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('admin.actions.adminTitle')}</h2>
              <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('admin.actions.adminHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionBusy || locked || (isSelf && account.siteAdmin)}
              onClick={() =>
                runAction(() => patchAdminAccount(account.id, { siteAdmin: !account.siteAdmin }))
              }
            >
              {account.siteAdmin ? t('admin.actions.revokeAdmin') : t('admin.actions.grantAdmin')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('admin.actions.revokeTitle')}</h2>
              <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('admin.actions.revokeHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionBusy || locked}
              onClick={() => runAction(() => revokeAdminAccountSessions(account.id))}
            >
              {t('admin.actions.revokeSessions')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-3 border-[#f1c5c7] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('admin.actions.deleteTitle')}</h2>
              <p className="m-0 mt-1 text-bb-sm text-bb-muted">
                {locked
                  ? t('admin.actions.deleteDoneHelp')
                  : isSelf
                    ? t('admin.actions.deleteSelfHelp')
                    : t('admin.actions.deleteHelp')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actionBusy || locked || isSelf}
              className="border-[#b01b22] text-[var(--bb-danger-color)] hover:border-[#8f161c] hover:bg-red-50 hover:text-[#8f161c]"
              onClick={() => setDeleteOpen(true)}
            >
              {locked ? t('admin.actions.deleted') : t('admin.actions.delete')}
            </Button>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteConvId)}
        title={t('admin.conversations.deleteConfirmTitle')}
        body={t('admin.conversations.deleteConfirmBody')}
        confirmLabel={t('admin.conversations.delete')}
        confirming={actionBusy}
        onCancel={() => {
          if (!actionBusy) setDeleteConvId(null)
        }}
        onConfirm={async () => {
          if (!deleteConvId) return
          setActionBusy(true)
          try {
            await deleteAdminConversation(deleteConvId)
            setConversations((prev) => prev.filter((c) => c.id !== deleteConvId))
            setDeleteConvId(null)
          } catch (err) {
            setActionError(err.message || t('admin.actionError'))
          } finally {
            setActionBusy(false)
          }
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={t('admin.actions.deleteConfirmTitle')}
        body={t('admin.actions.deleteConfirmBody', { name: account.displayName })}
        confirmLabel={t('admin.actions.delete')}
        confirming={actionBusy}
        onCancel={() => {
          if (!actionBusy) setDeleteOpen(false)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
