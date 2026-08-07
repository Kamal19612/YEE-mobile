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
 * Fiche institution — header type profil (cover + avatar) + contenu.
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
      <div className="w-full space-y-4">
        <div className="h-52 animate-pulse rounded-bb bg-bb-alt" />
        <div className="h-12 animate-pulse rounded-bb bg-bb-alt" />
        <div className="h-40 animate-pulse rounded-bb bg-bb-alt" />
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
        <Button type="button" size="sm" className="min-h-10 flex-1 touch-manipulation sm:flex-none" disabled={busy} onClick={onRequest}>
          {t('institutions.requestAffiliation')}
        </Button>
      )
    } else if (status === 'pending') {
      actions = (
        <>
          <span className="inline-flex items-center rounded-bb-inner bg-bb-alt px-3 py-1.5 text-bb-sm text-bb-muted">
            {t('institutions.status.pending')}
          </span>
          <Button type="button" size="sm" variant="outline" className="min-h-10 flex-1 touch-manipulation sm:flex-none" disabled={busy} onClick={onCancel}>
            {t('institutions.cancelRequest')}
          </Button>
        </>
      )
    } else if (status === 'active') {
      actions = (
        <Button type="button" size="sm" variant="outline" className="min-h-10 flex-1 touch-manipulation sm:flex-none" disabled={busy} onClick={onCancel}>
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
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="h-64 animate-pulse rounded-bb bg-bb-alt" />
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
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedAffiliations.map((a) => (
              <AffiliationMemberCard
                key={a.user.id}
                affiliation={a}
                institution={institution}
                isYou={Boolean(user && String(user.id) === String(a.user.id))}
              />
            ))}
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

function AffiliationMemberCard({ affiliation, institution, isYou }) {
  const { t } = useTranslation()
  const user = affiliation.user
  const role = affiliation.isReferent ? 'referent' : 'member'
  const instType = institution?.type || 'local'
  const roleLabel = t(`institutions.memberRoleTyped.${instType}.${role}`, {
    defaultValue: t(`institutions.memberRole.${role}`),
  })
  const memberTypeLabel = user.memberType
    ? String(user.memberType)
    : null
  const coverUrl = user.coverUrl || user.cover

  return (
    <li className="list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content text-center shadow-card transition-shadow duration-200 ease-bb hover:shadow-card-hover">
      <div
        className="h-24 bg-cover bg-center"
        style={
          coverUrl
            ? { backgroundImage: `url(${coverUrl})` }
            : {
                backgroundImage:
                  'linear-gradient(135deg, var(--bb-primary-color) 0%, #3d4f6a 48%, var(--bb-accent-color) 120%)',
              }
        }
      />
      <div className="-mt-10 px-4 pb-4">
        <Link to={`/members/${user.id}`} className="relative mx-auto inline-block">
          <Avatar
            name={user.displayName}
            src={user.avatarUrl || user.avatar}
            size="xl"
            className="ring-4 ring-bb-content"
          />
        </Link>

        <div className="mt-2">
          <Link
            to={`/members/${user.id}`}
            className="line-clamp-2 text-[1.125rem] font-medium text-bb-heading hover:text-bb-primary"
          >
            {user.displayName}
          </Link>
          {isYou ? (
            <p className="m-0 mt-0.5 text-bb-xs text-bb-muted">{t('institutions.you')}</p>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className={clsx(
              'inline-flex rounded-bb-option px-2 py-0.5 text-[11px] font-semibold',
              affiliation.isReferent
                ? 'bg-[rgba(var(--bb-primary-color-rgb),0.12)] text-bb-primary'
                : 'bg-[var(--bb-label-background-color)] text-[var(--bb-label-text-color)]',
            )}
          >
            {roleLabel}
          </span>
          {memberTypeLabel ? (
            <span className="inline-flex rounded-bb-option bg-bb-alt px-2 py-0.5 text-[11px] font-medium text-bb-muted">
              {memberTypeLabel}
            </span>
          ) : null}
        </div>

        {user.profession ? (
          <p className="m-0 mt-2 line-clamp-2 text-bb-sm text-bb-text">{user.profession}</p>
        ) : (
          <p className="m-0 mt-2 text-bb-sm text-bb-muted">{t('members.noProfession')}</p>
        )}

        {affiliation.decidedAt ? (
          <p className="m-0 mt-1.5 text-bb-xs text-bb-muted">
            {t('institutions.affiliatedSince', {
              date: formatAffiliationDate(affiliation.decidedAt),
            })}
          </p>
        ) : null}

        <Button
          as={Link}
          to={`/members/${user.id}`}
          variant="outline"
          size="sm"
          className="mt-4 min-h-10 w-full touch-manipulation"
        >
          {t('members.viewProfile')}
        </Button>
      </div>
    </li>
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
