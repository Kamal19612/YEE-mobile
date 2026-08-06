import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { UserPicker } from '../../components/ui/UserPicker'
import { useInstitutionAffiliations } from '../../hooks/useInstitutions'

function mapError(err, t, fallbackKey) {
  const code = err?.code || err?.body?.error?.code
  const byCode = {
    forbidden: t('institutions.errors.forbidden'),
    has_children: t('institutions.errors.hasChildren'),
    parent_not_found: t('institutions.errors.parentNotFound'),
    institution_not_found: t('institutions.errors.notFound'),
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
 * Panneau référent — demandes d’affiliation + gestion des référents.
 * Monté uniquement si `institution.viewerIsReferent === true`.
 */
export function ReferentPanel({ institution }) {
  const { t } = useTranslation()
  const pending = useInstitutionAffiliations(institution.id, 'pending')
  const active = useInstitutionAffiliations(institution.id, 'active')
  const [addUser, setAddUser] = useState(null)
  const [removeUser, setRemoveUser] = useState(null)
  const [addKey, setAddKey] = useState(0)
  const [removeKey, setRemoveKey] = useState(0)
  const [addBusy, setAddBusy] = useState(false)
  const [removeBusy, setRemoveBusy] = useState(false)
  const [addMsg, setAddMsg] = useState(null)
  const [addErr, setAddErr] = useState(null)
  const [removeMsg, setRemoveMsg] = useState(null)
  const [removeErr, setRemoveErr] = useState(null)
  const [rowBusy, setRowBusy] = useState(null)
  const [localError, setLocalError] = useState(null)

  const wrap = async (userId, fn) => {
    setLocalError(null)
    setRowBusy(userId)
    try {
      await fn()
    } catch (err) {
      setLocalError(mapError(err, t, 'institutions.errors.forbidden'))
    } finally {
      setRowBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      {(localError || pending.actionError || active.actionError) && (
        <div className="bb-card p-3 text-bb-sm text-bb-danger" role="alert">
          {localError || pending.actionError || active.actionError}
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

        {!pending.loading && pending.affiliations.length === 0 && (
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
                      disabled={busy}
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
                      disabled={busy}
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
        <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">
          {t('institutions.activeMembers')}
        </h2>
        {active.loading && <div className="h-16 animate-pulse rounded-bb bg-bb-alt" />}
        {!active.loading && active.affiliations.length === 0 && (
          <p className="m-0 text-bb-sm text-bb-muted">{t('institutions.noActiveMembers')}</p>
        )}
        {!active.loading && active.affiliations.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {active.affiliations.map((a) => (
              <li key={a.user.id} className="bb-card flex items-center gap-3 p-3">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bb-card space-y-5 p-4">
        <div>
          <h2 className="m-0 mb-1 text-bb-md font-semibold text-bb-heading">
            {t('institutions.manageReferents')}
          </h2>
          <p className="m-0 text-bb-sm text-bb-muted">{t('institutions.manageReferentsHint')}</p>
        </div>

        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!addUser?.id) return
            setAddBusy(true)
            setAddErr(null)
            setAddMsg(null)
            try {
              await pending.addReferent(addUser.id)
              setAddMsg(t('institutions.referentAdded'))
              setAddUser(null)
              setAddKey((k) => k + 1)
            } catch (err) {
              setAddErr(mapError(err, t, 'institutions.referentFailed'))
            } finally {
              setAddBusy(false)
            }
          }}
        >
          <span className="block text-bb-sm font-medium text-bb-heading">
            {t('institutions.addReferent')}
          </span>
          <div className="flex flex-wrap gap-2">
            <UserPicker
              key={addKey}
              value={addUser}
              onChange={setAddUser}
              disabled={addBusy}
              placeholder={t('institutions.referentSearchPlaceholder')}
            />
            <Button type="submit" size="sm" disabled={addBusy || !addUser?.id}>
              {addBusy ? t('common.loading') : t('institutions.nominateReferent')}
            </Button>
          </div>
          {addMsg && (
            <p className="m-0 text-bb-sm text-bb-success" role="status">
              {addMsg}
            </p>
          )}
          {addErr && (
            <p className="m-0 text-bb-sm text-bb-danger" role="alert">
              {addErr}
            </p>
          )}
        </form>

        <form
          className="space-y-2 border-t border-bb-border pt-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!removeUser?.id) return
            setRemoveBusy(true)
            setRemoveErr(null)
            setRemoveMsg(null)
            try {
              await pending.removeReferent(removeUser.id)
              setRemoveMsg(t('institutions.referentRemoved'))
              setRemoveUser(null)
              setRemoveKey((k) => k + 1)
            } catch (err) {
              setRemoveErr(mapError(err, t, 'institutions.referentRemoveFailed'))
            } finally {
              setRemoveBusy(false)
            }
          }}
        >
          <span className="block text-bb-sm font-medium text-bb-heading">
            {t('institutions.removeReferent')}
          </span>
          <p className="m-0 text-bb-xs text-bb-muted">{t('institutions.removeReferentHint')}</p>
          <div className="flex flex-wrap gap-2">
            <UserPicker
              key={removeKey}
              value={removeUser}
              onChange={setRemoveUser}
              disabled={removeBusy}
              placeholder={t('institutions.referentSearchPlaceholder')}
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={removeBusy || !removeUser?.id}
            >
              {removeBusy ? t('common.loading') : t('institutions.removeReferent')}
            </Button>
          </div>
          {removeMsg && (
            <p className="m-0 text-bb-sm text-bb-success" role="status">
              {removeMsg}
            </p>
          )}
          {removeErr && (
            <p className="m-0 text-bb-sm text-bb-danger" role="alert">
              {removeErr}
            </p>
          )}
        </form>
      </section>
    </div>
  )
}
