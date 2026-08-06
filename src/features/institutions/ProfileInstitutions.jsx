import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import {
  useInstitutionAffiliation,
  useMyInstitutions,
} from '../../hooks/useInstitutions'
import { InstitutionCard } from './InstitutionCard'
import { InstitutionCascadePicker } from './InstitutionCascadePicker'

/**
 * Section « Mes institutions » sur le profil.
 * Liste des affiliations actives + demande d’affiliation (cascade).
 */
export function ProfileInstitutions({ member, isOwn }) {
  const { t } = useTranslation()
  const { institutions, loading, error, reload } = useMyInstitutions(member?.id)
  const [requestOpen, setRequestOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formMessage, setFormMessage] = useState(null)

  const { request } = useInstitutionAffiliation(selected?.id)

  const list = isOwn
    ? institutions.filter((i) => i.viewerAffiliationStatus === 'active')
    : institutions

  const onRequest = async (e) => {
    e.preventDefault()
    if (!selected?.id) return
    setBusy(true)
    setFormError(null)
    setFormMessage(null)
    try {
      await request()
      setFormMessage(t('institutions.requestSent'))
      setSelected(null)
      setRequestOpen(false)
      reload()
    } catch (err) {
      const code = err.code || err.body?.error?.code
      setFormError(
        code === 'forbidden'
          ? t('institutions.errors.forbidden')
          : err.message || t('institutions.requestFailed'),
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="aspect-square animate-pulse rounded-bb border border-bb-border/50 bg-bb-content/40"
          />
        ))}
      </ul>
    )
  }

  if (error) {
    return <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-bb-md font-semibold text-bb-heading">
            {t('institutions.myInstitutions')}
          </h2>
          <p className="m-0 mt-1 text-bb-sm text-bb-muted">
            {t('institutions.myInstitutionsHint')}
          </p>
        </div>
        {isOwn && (
          <Button
            type="button"
            size="sm"
            variant={requestOpen ? 'outline' : 'primary'}
            onClick={() => {
              setRequestOpen((v) => !v)
              setFormError(null)
              setFormMessage(null)
            }}
          >
            {requestOpen ? t('common.cancel') : t('institutions.requestAffiliation')}
          </Button>
        )}
      </header>

      {formMessage && (
        <p className="m-0 text-bb-sm text-bb-success" role="status">
          {formMessage}
        </p>
      )}

      {isOwn && requestOpen && (
        <form
          className="space-y-3 rounded-[1.25rem] border border-bb-border bg-bb-content p-4"
          onSubmit={onRequest}
        >
          <p className="m-0 text-bb-sm text-bb-muted">{t('institutions.cascade.hint')}</p>
          <InstitutionCascadePicker
            value={selected?.id || null}
            onChange={setSelected}
            disabled={busy}
          />
          {formError && (
            <p className="m-0 text-bb-sm text-bb-danger" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" size="sm" disabled={busy || !selected?.id}>
            {busy ? t('common.loading') : t('institutions.submitRequest')}
          </Button>
        </form>
      )}

      {list.length === 0 ? (
        <div className="rounded-[1.25rem] border border-bb-border p-8 text-center text-bb-sm text-bb-muted">
          {t('institutions.empty')}
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((inst) => (
            <InstitutionCard key={inst.id} institution={inst} showDescription={false} />
          ))}
        </ul>
      )}
    </div>
  )
}
