import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  createAdminInstitution,
  fetchAdminInstitutions,
  rejectAdminInstitution,
} from '../../api/admin'
import { Button } from '../../components/ui/Button'
import { IconSearch } from '../../components/icons'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { useBackgroundSync } from '../../lib/useBackgroundSync'

const PER_PAGE = 20
const STATUS_FILTERS = ['PENDING', 'CREEE', 'REJETEE', 'all']

function StatusPill({ status, t }) {
  const tone =
    status === 'PENDING'
      ? 'bg-afr-gold-tint text-afr-gold-text'
      : status === 'CREEE'
        ? 'bg-afr-success-tint text-afr-success'
        : 'bg-afr-danger-tint text-afr-danger'
  return (
    <span
      className={clsx(
        'inline-flex h-[26px] items-center rounded-full px-2.5 text-[11px] font-extrabold uppercase tracking-[0.04em]',
        tone,
      )}
    >
      {t(`admin.institutions.status.${status}`)}
    </span>
  )
}

function typeLabel(type, t) {
  return t(`admin.institutions.types.${type}`, { defaultValue: type })
}

export function AdminInstitutionsPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [creationStatus, setCreationStatus] = useState('PENDING')
  const [page, setPage] = useState(1)
  const [institutions, setInstitutions] = useState([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
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
        const result = await fetchAdminInstitutions({
          q: debouncedQ,
          creationStatus,
          page,
          perPage: PER_PAGE,
        })
        setInstitutions(result.institutions)
        setMeta(result.meta)
        if (silent) setError(null)
      } catch (err) {
        if (silent) return
        setInstitutions([])
        setError(err.message || t('admin.institutions.loadError'))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [debouncedQ, creationStatus, page, t],
  )

  useEffect(() => {
    load({ silent: false })
  }, [load])

  const silentReload = useCallback(() => load({ silent: true }), [load])
  useBackgroundSync(QueryKeys.institutions, silentReload)

  const runCreate = async (institution) => {
    if (!institution?.id) return
    setBusyId(institution.id)
    setActionError(null)
    setActionInfo(null)
    try {
      const result = await createAdminInstitution(institution.id)
      setActionInfo(result?.message || t('admin.institutions.created', { name: institution.name }))
      invalidate(QueryKeys.institutions, { reason: 'adminCreateInstitution', id: institution.id })
      await load({ silent: true })
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
    } finally {
      setBusyId(null)
    }
  }

  const runReject = async (institution) => {
    if (!institution?.id) return
    setBusyId(institution.id)
    setActionError(null)
    setActionInfo(null)
    try {
      const result = await rejectAdminInstitution(institution.id)
      setActionInfo(result?.message || t('admin.institutions.rejected', { name: institution.name }))
      invalidate(QueryKeys.institutions, { reason: 'adminRejectInstitution', id: institution.id })
      await load({ silent: true })
    } catch (err) {
      setActionError(err.message || t('admin.actionError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="w-full">
      <header className="mb-6">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.1em] text-bb-muted">
          {t('admin.section')}
        </p>
        <h1 className="m-0 mt-1.5 font-display text-[26px] font-extrabold leading-tight text-bb-heading bb:text-[30px]">
          {t('admin.institutions.title')}
        </h1>
        <p className="m-0 mt-1.5 text-bb-base text-bb-muted">{t('admin.institutions.subtitle')}</p>
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
            placeholder={t('admin.institutions.searchPlaceholder')}
            className="h-12 w-full rounded-full border border-bb-border bg-bb-content pl-12 pr-[18px] text-bb-base text-bb-heading outline-none transition-colors placeholder:text-afr-slate focus:border-bb-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2.5">
          {STATUS_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setCreationStatus(id)
                setPage(1)
              }}
              className={clsx(
                'inline-flex h-11 items-center rounded-full border px-[18px] text-[14px] transition-colors',
                creationStatus === id
                  ? 'border-bb-primary bg-bb-primary font-bold text-white'
                  : 'border-bb-border bg-bb-content font-semibold text-bb-heading hover:border-bb-primary',
              )}
            >
              {t(`admin.institutions.filters.${id}`)}
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
        <div className="mb-4 rounded-bb-input bg-afr-success-tint px-4 py-3 text-bb-sm font-medium text-afr-success" role="status">
          {actionInfo}
        </div>
      )}

      {!loading && !error && institutions.length === 0 && (
        <div className="bb-card px-6 py-8 text-center text-bb-sm text-bb-muted">
          {t('admin.institutions.empty')}
        </div>
      )}

      {!loading && !error && institutions.length > 0 && (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {institutions.map((institution) => {
              const canCreate =
                institution.creationStatus === 'PENDING' || institution.creationStatus === 'REJETEE'
              const canReject = institution.creationStatus === 'PENDING'
              return (
                <li
                  key={institution.id}
                  className="rounded-afr-list border border-bb-border bg-bb-content p-[18px]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-bb-md font-bold text-bb-heading">
                          {institution.name}
                        </span>
                        <StatusPill status={institution.creationStatus} t={t} />
                      </div>
                      <p className="m-0 mt-1 text-bb-sm text-bb-muted">
                        {typeLabel(institution.type, t)}
                        {institution.externalId ? ` · ${institution.externalId}` : ''}
                      </p>
                      {institution.description ? (
                        <p className="m-0 mt-2 line-clamp-2 text-bb-sm text-bb-text">
                          {institution.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {canCreate && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={busyId === institution.id}
                          onClick={() => runCreate(institution)}
                        >
                          {busyId === institution.id
                            ? t('admin.institutions.creating')
                            : t('admin.institutions.create')}
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyId === institution.id}
                          onClick={() => runReject(institution)}
                        >
                          {t('admin.institutions.reject')}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!meta.hasPrev || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('admin.prevPage')}
              </Button>
              <span className="text-bb-sm text-bb-muted">
                {t('admin.pageOf', { page: meta.page, total: meta.totalPages })}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('admin.nextPage')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
