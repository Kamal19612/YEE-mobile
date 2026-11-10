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
  verifyAdminAccount,
} from '../../api/admin'
import { deleteAdminConversation, fetchAdminUserConversations } from '../../api/messages'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { IconActivity, IconInbox } from '../../components/icons'
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
  let statusLabel = t('admin.status.unverified')
  let statusClass = 'bg-afr-gold-tint text-afr-gold-text'
  if (account.accountDeleted) {
    statusLabel = t('admin.status.deleted')
    statusClass = 'bg-afr-danger-tint text-afr-danger'
  } else if (account.accountDeactivated || account.accountStatus === 'DESACTIVE') {
    statusLabel = t('admin.status.deactivated')
    statusClass = 'bg-afr-danger-tint text-afr-danger'
  } else if (account.accountStatus === 'A_VERIFIER') {
    statusLabel = t('admin.status.pendingVerify')
  } else if (account.accountStatus === 'VERIFIE') {
    statusLabel = t('admin.status.awaitingPassword')
  } else if (account.emailVerified || account.accountStatus === 'ACTIF') {
    statusLabel = t('admin.status.active')
    statusClass = 'bg-afr-success-tint text-afr-success'
  }

  return (
    <div className="flex flex-wrap gap-2">
      {account.siteAdmin && (
        <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-primary-tint text-afr-primary">
          {t('admin.status.admin')}
        </span>
      )}
      <span
        className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] ${statusClass}`}
      >
        {statusLabel}
      </span>
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
  const [actionInfo, setActionInfo] = useState(null)
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
    setActionInfo(null)
    try {
      const result = await fn()
      if (result?.message) setActionInfo(result.message)
      await loadAccount()
      return result
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
      return null
    } finally {
      setActionBusy(false)
    }
  }

  const canInviteActivation =
    !account?.accountDeleted &&
    !account?.accountDeactivated &&
    (account?.accountStatus === 'A_VERIFIER' || account?.accountStatus === 'VERIFIE')

  if (loading) {
    return <div className="h-40 animate-pulse rounded-bb bg-afr-line" />
  }

  if (error || !account) {
    return (
      <div className="space-y-3">
        <Link to="/admin/accounts" className="inline-flex min-h-[44px] items-center text-bb-sm font-bold text-bb-primary hover:underline">
          ← {t('admin.backToList')}
        </Link>
        <div className="rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger" role="alert">
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
      <Link to="/admin/accounts" className="inline-flex min-h-[44px] items-center text-bb-sm font-bold text-bb-primary hover:underline">
        ← {t('admin.backToList')}
      </Link>

      <header className="mt-2 mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={account.displayName} src={account.avatarUrl} size="xl" />
          <div className="min-w-0">
            <h1 className="m-0 break-words font-display text-[26px] font-extrabold leading-tight text-bb-heading bb:text-[30px]">{account.displayName}</h1>
            <p className="m-0 mt-1.5 break-all text-bb-base text-bb-muted">
              @{account.mentionName || '—'} · {account.email}
            </p>
            <div className="mt-3">
              <StatusPills account={account} t={t} />
            </div>
          </div>
        </div>
        <Button as={Link} to={`/members/${account.id}`} size="sm" variant="secondary" className="shrink-0 self-start">
          {t('admin.viewPublicProfile')}
        </Button>
      </header>

      <div className="bb-scroll-tabs mb-6 gap-6 border-b border-bb-border">
        {['overview', 'activity', 'conversations', 'actions'].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'h-12 shrink-0 whitespace-nowrap border-b-2 px-1 text-bb-base transition-colors',
              tab === id
                ? 'border-bb-primary font-bold text-bb-primary'
                : 'border-transparent font-semibold text-bb-muted hover:text-bb-heading',
            )}
          >
            {t(`admin.tabs.${id}`)}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-6 rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger" role="alert">
          {actionError}
        </div>
      )}

      {actionInfo && (
        <div className="mb-6 break-all rounded-bb-input bg-afr-success-tint px-4 py-3 text-bb-sm font-medium text-afr-success" role="status">
          {actionInfo}
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 bb:gap-6 lg:grid-cols-2">
          <section className="bb-card p-[18px] bb:p-6">
            <h2 className="m-0 mb-4 text-[17px] font-bold text-bb-heading">{t('admin.overview.identity')}</h2>
            <dl className="m-0 grid gap-3.5">
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.profession')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">{account.profession || '—'}</dd>
              </div>
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.organization')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">{account.organization || '—'}</dd>
              </div>
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.location')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">{account.location || '—'}</dd>
              </div>
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.bio')}</dt>
                <dd className="m-0 mt-0.5 whitespace-pre-wrap text-bb-base leading-[1.65] text-bb-heading">{account.bio || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="bb-card p-[18px] bb:p-6">
            <h2 className="m-0 mb-4 text-[17px] font-bold text-bb-heading">{t('admin.overview.account')}</h2>
            <dl className="m-0 grid gap-3.5">
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.created')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">{formatDate(account.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.updated')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">{formatDate(account.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.deactivatedAt')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">{formatDate(account.deactivatedAt)}</dd>
              </div>
              <div>
                <dt className="text-bb-sm font-medium text-bb-muted">{t('admin.overview.stats')}</dt>
                <dd className="m-0 mt-0.5 text-bb-base text-bb-heading">
                  {t('admin.table.statsValues', {
                    posts: account.postsCount ?? 0,
                    followers: account.followersCount ?? 0,
                  })}{' '}
                  · {t('admin.overview.following', { count: account.followingCount ?? 0 })}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bb-card p-[18px] bb:p-6 lg:col-span-2">
            <h2 className="m-0 mb-4 text-[17px] font-bold text-bb-heading">
              {t('admin.overview.sessions', { count: account.activeSessions?.length || 0 })}
            </h2>
            {!account.activeSessions?.length ? (
              <p className="m-0 text-bb-sm text-bb-muted">{t('admin.overview.noSessions')}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {account.activeSessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-afr-tile border border-bb-border bg-afr-ground px-4 py-3 text-bb-sm"
                  >
                    <p className="m-0 font-semibold text-bb-heading">
                      {session.ipAddress || t('admin.overview.unknownIp')}
                      {session.rememberMe ? ` · ${t('admin.overview.rememberMe')}` : ''}
                    </p>
                    <p className="m-0 mt-1 break-words text-bb-muted">{session.userAgent || '—'}</p>
                    <p className="m-0 mt-1 text-bb-xs text-bb-muted">
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
          <div className="mb-5 flex flex-wrap gap-2.5">
            {ACTIVITY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActivityFilter(filter.id)}
                className={clsx(
                  'inline-flex h-11 items-center rounded-full border px-[18px] text-[14px] transition-colors',
                  activityFilter === filter.id
                    ? 'border-bb-primary bg-bb-primary font-bold text-white'
                    : 'border-bb-border bg-bb-content font-semibold text-bb-heading hover:border-bb-primary',
                )}
              >
                {t(`admin.activityFilters.${filter.id}`)}
              </button>
            ))}
          </div>

          {activityError && (
            <div className="mb-4 rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger" role="alert">
              {activityError}
            </div>
          )}

          {activityLoading && activity.length === 0 && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[76px] animate-pulse rounded-afr-list bg-afr-line" />
              ))}
            </div>
          )}

          {!activityLoading && !activityError && activity.length === 0 && (
            <div className="bb-card flex flex-col items-center gap-2.5 px-6 py-8 text-center text-bb-sm text-bb-muted">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-afr-primary-tint text-bb-primary">
                <IconActivity className="h-6 w-6" />
              </span>
              {t('admin.activityEmpty')}
            </div>
          )}

          {activity.length > 0 && (
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {activity.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="rounded-afr-list border border-bb-border bg-bb-content px-[18px] py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em] bg-afr-line text-afr-slate">
                      {t(`admin.activityTypes.${item.type}`, { defaultValue: item.type })}
                    </span>
                    <span className="text-bb-xs text-bb-muted">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="m-0 mt-2 text-bb-base leading-[1.65] text-bb-heading">{item.summary}</p>
                  {item.type === 'institution' && item.meta?.institutionId ? (
                    <Link
                      to={`/institutions/${item.meta.institutionId}`}
                      className="mt-1.5 inline-block text-bb-sm font-bold text-bb-primary hover:underline"
                    >
                      {item.meta.institutionName || t('institutions.title')}
                    </Link>
                  ) : null}
                  {item.type === 'group' && item.meta?.groupId ? (
                    <Link
                      to={`/groups/${item.meta.groupId}`}
                      className="mt-1.5 inline-block text-bb-sm font-bold text-bb-primary hover:underline"
                    >
                      {item.meta.groupName || t('groups.title')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          {activityMeta.hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                size="sm"
                variant="secondary"
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
        <div className="flex flex-col gap-4">
          {conversationsLoading && <p className="m-0 text-bb-sm text-bb-muted">{t('admin.conversations.loading')}</p>}
          {!conversationsLoading && !conversations.length && (
            <p className="bb-card m-0 flex flex-col items-center gap-2.5 px-6 py-8 text-center text-bb-sm text-bb-muted">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-afr-primary-tint text-bb-primary">
                <IconInbox className="h-6 w-6" />
              </span>
              {t('admin.conversations.empty')}
            </p>
          )}
          {conversations.map((thread) => (
            <section
              key={thread.id}
              className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h2 className="m-0 truncate text-bb-md font-bold text-bb-heading">
                  {thread.isGroup ? thread.subject : thread.participants.map((p) => p.displayName).join(', ')}
                </h2>
                <p className="m-0 mt-1 truncate text-bb-sm text-bb-muted">
                  {thread.lastMessage?.content?.replace(/<[^>]+>/g, '') || t('admin.conversations.noPreview')}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button as={Link} to={`/messages/${thread.id}`} size="sm" variant="secondary">
                  {t('admin.conversations.open')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
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
        <div className="flex flex-col gap-4">
          <section className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[17px] font-bold text-bb-heading">
                {account.accountDeactivated ? t('admin.actions.reactivateTitle') : t('admin.actions.deactivateTitle')}
              </h2>
              <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">
                {account.accountDeactivated
                  ? t('admin.actions.reactivateHelp')
                  : t('admin.actions.deactivateHelp')}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={account.accountDeactivated ? 'primary' : 'danger'}
              className="shrink-0 self-start sm:self-auto"
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

          <section className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[17px] font-bold text-bb-heading">{t('admin.actions.verifyInviteTitle')}</h2>
              <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">{t('admin.actions.verifyInviteHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="shrink-0 self-start sm:self-auto"
              disabled={actionBusy || locked || !canInviteActivation}
              onClick={() =>
                runAction(async () => {
                  const result = await verifyAdminAccount(account.id)
                  const link = Array.isArray(result?.activationLinks)
                    ? result.activationLinks[0]?.activationUrl
                    : null
                  return {
                    message: link
                      ? t('admin.actions.verifyInviteDevLink', { url: link })
                      : t('admin.actions.verifyInviteSent', {
                          name: account.displayName || account.email,
                        }),
                  }
                })
              }
            >
              {account.accountStatus === 'VERIFIE'
                ? t('admin.actions.resendInvite')
                : t('admin.actions.verifyInvite')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[17px] font-bold text-bb-heading">{t('admin.actions.verifyTitle')}</h2>
              <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">{t('admin.actions.verifyHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 self-start sm:self-auto"
              disabled={actionBusy || locked || account.emailVerified || canInviteActivation}
              onClick={() => runAction(() => patchAdminAccount(account.id, { emailVerified: true }))}
            >
              {account.emailVerified ? t('admin.actions.alreadyVerified') : t('admin.actions.verify')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[17px] font-bold text-bb-heading">{t('admin.actions.adminTitle')}</h2>
              <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">{t('admin.actions.adminHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 self-start sm:self-auto"
              disabled={actionBusy || locked || (isSelf && account.siteAdmin)}
              onClick={() =>
                runAction(() => patchAdminAccount(account.id, { siteAdmin: !account.siteAdmin }))
              }
            >
              {account.siteAdmin ? t('admin.actions.revokeAdmin') : t('admin.actions.grantAdmin')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[17px] font-bold text-bb-heading">{t('admin.actions.revokeTitle')}</h2>
              <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">{t('admin.actions.revokeHelp')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 self-start sm:self-auto"
              disabled={actionBusy || locked}
              onClick={() => runAction(() => revokeAdminAccountSessions(account.id))}
            >
              {t('admin.actions.revokeSessions')}
            </Button>
          </section>

          <section className="bb-card flex flex-col gap-4 p-[18px] bb:p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-[17px] font-bold text-bb-heading">{t('admin.actions.deleteTitle')}</h2>
              <p className="m-0 mt-1.5 text-bb-sm text-bb-muted">
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
              variant="danger"
              disabled={actionBusy || locked || isSelf}
              className="shrink-0 self-start sm:self-auto"
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
