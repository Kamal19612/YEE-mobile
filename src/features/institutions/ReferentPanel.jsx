import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { UserPicker } from '../../components/ui/UserPicker'
import { useInstitutionAffiliations } from '../../hooks/useInstitutions'

function mapError(err, t, fallbackKey) {
  const code = err?.code || err?.body?.error?.code
  const byCode = {
    forbidden: t('institutions.errors.forbidden'),
    has_children: t('institutions.errors.hasChildren'),
    parent_not_found: t('institutions.errors.parentNotFound'),
    institution_not_found: t('institutions.errors.notFound'),
    last_referent: t('institutions.errors.lastReferent'),
  }
  return byCode[code] || err?.message || t(fallbackKey)
}

function formatRequestedAt(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

/**
 * Panneau référent — demandes d’affiliation + liste des membres (nommer / retirer référent).
 * Monté uniquement si `institution.viewerIsReferent === true`.
 */
export function ReferentPanel({ institution }) {
  const { t } = useTranslation()
  const pending = useInstitutionAffiliations(institution.id, 'pending')
  const active = useInstitutionAffiliations(institution.id, 'active')
  const [rowBusy, setRowBusy] = useState(null)
  const [localError, setLocalError] = useState(null)
  const [actionMsg, setActionMsg] = useState(null)
  const [nominee, setNominee] = useState(null)
  const [nominating, setNominating] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const wrap = async (userId, fn) => {
    setLocalError(null)
    setActionMsg(null)
    setRowBusy(userId)
    try {
      await fn()
    } catch (err) {
      setLocalError(mapError(err, t, 'institutions.errors.forbidden'))
    } finally {
      setRowBusy(null)
    }
  }

  const referentCount = (active.affiliations || []).filter((a) => a.isReferent).length

  const sortedActive = [...(active.affiliations || [])].sort((a, b) => {
    if (a.isReferent === b.isReferent) {
      return String(a.user.displayName || '').localeCompare(String(b.user.displayName || ''))
    }
    return a.isReferent ? -1 : 1
  })

  const loadError = pending.error || active.error

  return (
    <div className="space-y-6">
      {(localError || pending.actionError || active.actionError) && (
        <div className="bb-card p-3 text-bb-sm text-bb-danger" role="alert">
          {localError || pending.actionError || active.actionError}
        </div>
      )}
      {loadError && !pending.actionError && !active.actionError && (
        <div className="bb-card p-3 text-bb-sm text-bb-danger" role="alert">
          {loadError}
        </div>
      )}
      {actionMsg && (
        <div className="bb-card p-3 text-bb-sm text-bb-success" role="status">
          {actionMsg}
        </div>
      )}

      <section>
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="m-0 text-bb-md font-semibold text-bb-heading">
              {t('institutions.pendingRequests')}
            </h2>
            <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('institutions.referentHint')}</p>
          </div>
          {!pending.loading && pending.affiliations.length > 0 && (
            <span className="rounded-bb-inner bg-[rgba(var(--bb-primary-color-rgb),0.1)] px-2.5 py-1 text-bb-xs font-semibold text-bb-primary">
              {t('institutions.pendingCount', { count: pending.affiliations.length })}
            </span>
          )}
        </header>

        {pending.loading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-bb bg-bb-alt" />
            ))}
          </div>
        )}

        {!pending.loading && !pending.error && pending.affiliations.length === 0 && (
          <div className="bb-card p-6 text-center text-bb-sm text-bb-muted">
            {t('institutions.noPending')}
          </div>
        )}

        {!pending.loading && pending.affiliations.length > 0 && (
          <ul className="m-0 list-none space-y-2 p-0">
            {pending.affiliations.map((a) => {
              const requestedLabel = formatRequestedAt(a.requestedAt)
              const busy = rowBusy === a.user.id
              return (
                <li
                  key={a.user.id || a.requestedAt}
                  className="bb-card flex flex-wrap items-center justify-between gap-3 p-3 transition-shadow duration-150 hover:shadow-card-hover"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.user.displayName} src={a.user.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <Link
                        to={`/members/${a.user.id}`}
                        className="block truncate text-bb-sm font-medium text-bb-heading hover:text-bb-primary"
                      >
                        {a.user.displayName}
                      </Link>
                      {a.user.profession ? (
                        <div className="truncate text-bb-xs text-bb-muted">{a.user.profession}</div>
                      ) : null}
                      {requestedLabel ? (
                        <div className="text-bb-xs text-bb-muted">
                          {t('institutions.requestedOn', { date: requestedLabel })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !a.user.id}
                      onClick={() =>
                        wrap(a.user.id, async () => {
                          await pending.approve(a.user.id)
                          await active.reload()
                        })
                      }
                    >
                      {t('institutions.approve')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || !a.user.id}
                      onClick={() => wrap(a.user.id, () => pending.reject(a.user.id))}
                    >
                      {t('institutions.reject')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <header className="mb-3">
          <h2 className="m-0 text-bb-md font-semibold text-bb-heading">
            {t('institutions.manageReferents')}
          </h2>
          <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('institutions.addReferentHint')}</p>
        </header>
        <div className="bb-card flex flex-col gap-3 p-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <UserPicker
              value={nominee}
              onChange={setNominee}
              placeholder={t('institutions.referentSearchPlaceholder')}
              disabled={nominating}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!nominee?.id || nominating}
            onClick={() =>
              wrap(nominee.id, async () => {
                setNominating(true)
                try {
                  await active.addReferent(nominee.id)
                  setActionMsg(t('institutions.referentAdded'))
                  setNominee(null)
                  await active.reload()
                } finally {
                  setNominating(false)
                }
              })
            }
          >
            {nominating ? t('common.loading') : t('institutions.addReferent')}
          </Button>
        </div>
      </section>

      <section>
        <header className="mb-3">
          <h2 className="m-0 text-bb-md font-semibold text-bb-heading">
            {t('institutions.activeMembers')}
          </h2>
          <p className="m-0 mt-1 text-bb-sm text-bb-muted">{t('institutions.manageReferentsListHint')}</p>
        </header>

        {active.loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-bb bg-bb-alt" />
            ))}
          </div>
        )}

        {!active.loading && !active.error && sortedActive.length === 0 && (
          <div className="bb-card p-6 text-center text-bb-sm text-bb-muted">
            {t('institutions.noActiveMembers')}
          </div>
        )}

        {!active.loading && sortedActive.length > 0 && (
          <ul className="m-0 list-none space-y-2 p-0">
            {sortedActive.map((a) => {
              const busy = rowBusy === a.user.id
              const lastReferent = a.isReferent && referentCount <= 1
              const roleLabel = a.isReferent
                ? t('institutions.memberRole.referent')
                : t('institutions.memberRole.member')
              return (
                <li
                  key={a.user.id}
                  className="bb-card flex flex-wrap items-center justify-between gap-3 p-3 transition-shadow duration-150 hover:shadow-card-hover"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={a.user.displayName} src={a.user.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <Link
                        to={`/members/${a.user.id}`}
                        className="block truncate text-bb-sm font-medium text-bb-heading hover:text-bb-primary"
                      >
                        {a.user.displayName}
                      </Link>
                      <span
                        className={clsx(
                          'mt-1 inline-flex rounded-bb-option px-2 py-0.5 text-[11px] font-semibold',
                          a.isReferent
                            ? 'bg-[rgba(var(--bb-primary-color-rgb),0.12)] text-bb-primary'
                            : 'bg-bb-alt text-bb-muted',
                        )}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {a.isReferent ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy || lastReferent}
                        title={lastReferent ? t('institutions.errors.lastReferent') : undefined}
                        onClick={() =>
                          wrap(a.user.id, async () => {
                            await active.removeReferent(a.user.id)
                            setActionMsg(t('institutions.referentRemoved'))
                            await active.reload()
                          })
                        }
                      >
                        {busy ? t('common.loading') : t('institutions.removeReferent')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          wrap(a.user.id, async () => {
                            await active.addReferent(a.user.id)
                            setActionMsg(t('institutions.referentAdded'))
                            await active.reload()
                          })
                        }
                      >
                        {busy ? t('common.loading') : t('institutions.nominateReferent')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || lastReferent}
                      title={lastReferent ? t('institutions.errors.lastReferent') : undefined}
                      onClick={() => setRemoveTarget(a)}
                    >
                      {t('institutions.removeMember')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title={t('institutions.removeMember')}
        body={t('institutions.removeMemberConfirm', {
          name: removeTarget?.user?.displayName || removeTarget?.user?.id || '',
        })}
        confirmLabel={t('institutions.removeMember')}
        confirming={Boolean(removeTarget && rowBusy === removeTarget.user.id)}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          const target = removeTarget
          if (!target?.user?.id) return
          wrap(target.user.id, async () => {
            await active.removeMember(target.user.id)
            setActionMsg(t('institutions.memberRemoved'))
            setRemoveTarget(null)
          })
        }}
      />
    </div>
  )
}
