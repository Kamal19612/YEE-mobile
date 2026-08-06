import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import {
  useInstitution,
  useInstitutionAffiliation,
  useInstitutionAffiliations,
  useInstitutionTree,
} from '../../hooks/useInstitutions'
import { InstitutionCard, InstitutionHero } from './InstitutionCard'
import { ReferentPanel } from './ReferentPanel'

/**
 * Fiche institution — hero bulle (cover + médaillon) + contenu plat.
 * `?tab=referent` ouvre le panneau référent si autorisé.
 */
export function InstitutionPage() {
  const { t } = useTranslation()
  const { institutionId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { institution, setInstitution, loading, error } = useInstitution(institutionId)
  const { request, cancel, actionError } = useInstitutionAffiliation(institutionId, {
    institution,
    setInstitution,
  })
  const [busy, setBusy] = useState(false)

  const panel =
    searchParams.get('tab') === 'referent' && institution?.viewerIsReferent
      ? 'referent'
      : 'overview'

  const setPanel = (next) => {
    if (next === 'referent') {
      setSearchParams({ tab: 'referent' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-5">
        <div className="mx-auto h-[240px] w-[240px] animate-pulse rounded-full bg-bb-alt" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-bb bg-bb-alt" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !institution) {
    return (
      <div className="w-full py-10 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">{t('institutions.notFound')}</h1>
        <p className="m-0 text-bb-sm text-bb-muted">{error || t('institutions.notFoundHint')}</p>
        <Button as={Link} to="/institutions" size="sm" className="mt-4">
          {t('institutions.backToDirectory')}
        </Button>
      </div>
    )
  }

  const canModerate = institution.viewerIsReferent
  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch {
      /* actionError */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bp-wrap w-full space-y-5">
      <InstitutionHeader
        institution={institution}
        busy={busy}
        onRequest={() => run(request)}
        onCancel={() => run(cancel)}
      />

      {actionError && (
        <p className="m-0 text-bb-sm text-bb-danger" role="alert">
          {actionError}
        </p>
      )}

      {canModerate && (
        <div
          className="flex w-fit overflow-hidden rounded-bb-input border border-bb-border self-start"
          role="tablist"
        >
          {[
            { id: 'overview', label: t('institutions.tabs.overview') },
            { id: 'referent', label: t('institutions.tabs.referent') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={panel === item.id}
              onClick={() => setPanel(item.id)}
              className={clsx(
                'px-3 py-1.5 text-bb-sm font-medium transition-colors',
                panel === item.id
                  ? 'bg-bb-primary text-white'
                  : 'bg-bb-content text-bb-text hover:text-bb-heading',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {panel === 'referent' && canModerate ? (
        <ReferentPanel institution={institution} />
      ) : (
        <InstitutionOverview institution={institution} />
      )}
    </div>
  )
}

function InstitutionHeader({ institution, busy, onRequest, onCancel }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const status = institution.viewerAffiliationStatus

  let actions = null
  if (user) {
    if (status === 'none' || status === 'rejected') {
      actions = (
        <Button type="button" size="sm" disabled={busy} onClick={onRequest}>
          {t('institutions.requestAffiliation')}
        </Button>
      )
    } else if (status === 'pending') {
      actions = (
        <>
          <span className="inline-flex items-center rounded-bb-inner bg-bb-alt px-3 py-1.5 text-bb-sm text-bb-muted">
            {t('institutions.status.pending')}
          </span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}>
            {t('institutions.cancelRequest')}
          </Button>
        </>
      )
    } else if (status === 'active') {
      actions = (
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}>
          {t('institutions.leave')}
        </Button>
      )
    }
  }

  return (
    <InstitutionHero
      institution={institution}
      actions={actions}
      backLink={
        <Link to="/institutions" className="text-bb-sm text-bb-primary hover:underline">
          ← {t('institutions.backToDirectory')}
        </Link>
      }
    />
  )
}

function InstitutionOverview({ institution }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const childType =
    institution.type === 'continent' ? 'country' : institution.type === 'country' ? 'local' : null
  const children = useInstitutionTree(childType ? institution.id : null, childType || undefined)
  const members = useInstitutionAffiliations(institution.id, 'active')

  const sortedAffiliations = [...(members.affiliations || [])].sort((a, b) => {
    if (a.isReferent === b.isReferent) return 0
    return a.isReferent ? -1 : 1
  })

  return (
    <div className="space-y-8">
      <section>
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="m-0 text-bb-md font-semibold text-bb-heading">
              {t('institutions.activeMembers')}
            </h2>
            <p className="m-0 mt-1 text-bb-sm text-bb-muted">
              {t('institutions.activeMembersHint')}
            </p>
          </div>
          {!members.loading && sortedAffiliations.length > 0 && (
            <span className="text-bb-sm text-bb-muted">
              {t(
                sortedAffiliations.length === 1
                  ? 'institutions.membersCount_one'
                  : 'institutions.membersCount_other',
                { count: sortedAffiliations.length },
              )}
            </span>
          )}
        </header>

        {members.loading && (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-28 animate-pulse rounded-bb bg-bb-alt" />
            ))}
          </ul>
        )}

        {members.error && <p className="m-0 text-bb-sm text-bb-danger">{members.error}</p>}

        {!members.loading && !members.error && sortedAffiliations.length === 0 && (
          <div className="rounded-bb border border-dashed border-bb-border px-4 py-10 text-center text-bb-sm text-bb-muted">
            {t('institutions.noActiveMembers')}
          </div>
        )}

        {!members.loading && sortedAffiliations.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {sortedAffiliations.map((a) => {
              const isYou = user && String(user.id) === String(a.user.id)
              const roleKey = a.isReferent
                ? 'institutions.memberRole.referent'
                : 'institutions.memberRole.member'
              return (
                <li
                  key={a.user.id}
                  className="bb-card flex items-start gap-3 p-4 transition-shadow duration-150 hover:shadow-card-hover"
                >
                  <Link to={`/members/${a.user.id}`} className="shrink-0">
                    <Avatar name={a.user.displayName} src={a.user.avatarUrl} size="lg" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/members/${a.user.id}`}
                        className="truncate font-medium text-bb-heading hover:text-bb-primary"
                      >
                        {a.user.displayName}
                      </Link>
                      {isYou && (
                        <span className="text-bb-xs text-bb-muted">{t('institutions.you')}</span>
                      )}
                    </div>
                    <span
                      className={clsx(
                        'mt-1.5 inline-flex rounded-bb-inner px-2 py-0.5 text-bb-xs font-semibold',
                        a.isReferent
                          ? 'bg-[rgba(var(--bb-primary-color-rgb),0.12)] text-bb-primary'
                          : 'bg-bb-alt text-bb-muted',
                      )}
                    >
                      {t(roleKey)}
                    </span>
                    {a.user.profession ? (
                      <p className="m-0 mt-2 truncate text-bb-sm text-bb-text">{a.user.profession}</p>
                    ) : null}
                    {a.decidedAt ? (
                      <p className="m-0 mt-1 text-bb-xs text-bb-muted">
                        {t('institutions.affiliatedSince', {
                          date: formatAffiliationDate(a.decidedAt),
                        })}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {childType && (
        <section>
          <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">
            {childType === 'country'
              ? t('institutions.children.countries')
              : t('institutions.children.locals')}
          </h2>
          {children.loading && (
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="aspect-square animate-pulse rounded-bb border border-bb-border/50 bg-bb-content/40"
                />
              ))}
            </ul>
          )}
          {children.error && <p className="m-0 text-bb-sm text-bb-danger">{children.error}</p>}
          {!children.loading && !children.error && children.institutions.length === 0 && (
            <p className="m-0 text-bb-sm text-bb-muted">
              {childType === 'country'
                ? t('institutions.children.emptyCountries')
                : t('institutions.children.emptyLocals')}
            </p>
          )}
          {!children.loading && children.institutions.length > 0 && (
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {children.institutions.map((child) => (
                <InstitutionCard key={child.id} institution={child} showDescription={false} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function formatAffiliationDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}
