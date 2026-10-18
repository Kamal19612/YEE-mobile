import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cancelAffiliation } from '../../api/institutions'
import { Button } from '../../components/ui/Button'
import {
  useInstitutionAffiliation,
  useMyInstitutions,
} from '../../hooks/useInstitutions'
import { INSTITUTION_CARD_GRID, InstitutionCard, InstitutionCardSkeleton } from './InstitutionCard'
import { InstitutionCascadePicker } from './InstitutionCascadePicker'

/**
 * Section « Mes institutions » sur le profil.
 * Liste des affiliations + demande d’affiliation (cascade).
 */
export function ProfileInstitutions({ member, isOwn }) {
  const { t } = useTranslation()
  const { institutions, loading, error, reload } = useMyInstitutions(member?.id, {
    status: isOwn ? 'all' : 'active',
  })
  const [requestOpen, setRequestOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formMessage, setFormMessage] = useState(null)
  const [cancelingId, setCancelingId] = useState(null)

  const { request } = useInstitutionAffiliation(selected?.id)

  const active = institutions.filter((i) => i.viewerAffiliationStatus === 'active')
  const pending = isOwn
    ? institutions.filter((i) => i.viewerAffiliationStatus === 'pending')
    : []
  const list = isOwn ? active : institutions

  const resetPicker = () => {
    setSelected(null)
    setPickerKey((k) => k + 1)
  }

  const onRequest = async (e) => {
    e.preventDefault()
    if (!selected?.id) return
    setBusy(true)
    setFormError(null)
    setFormMessage(null)
    try {
      await request()
      setFormMessage(t('institutions.requestSent'))
      resetPicker()
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

  const onCancelPending = async (institutionId) => {
    setCancelingId(institutionId)
    setFormError(null)
    try {
      await cancelAffiliation(institutionId)
      reload()
    } catch (err) {
      setFormError(err.message || t('institutions.errors.forbidden'))
    } finally {
      setCancelingId(null)
    }
  }

  if (loading) {
    return (
      <ul className={INSTITUTION_CARD_GRID}>
        {Array.from({ length: 4 }).map((_, i) => (
          <InstitutionCardSkeleton key={i} />
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
      {formError && !requestOpen && (
        <p className="m-0 text-bb-sm text-bb-danger" role="alert">
          {formError}
        </p>
      )}

      {isOwn && requestOpen && (
        <form
          className="space-y-3 rounded-[1.25rem] border border-bb-border bg-bb-content p-4"
          onSubmit={onRequest}
        >
          <p className="m-0 text-bb-sm text-bb-muted">{t('institutions.cascade.hint')}</p>
          <InstitutionCascadePicker
            key={pickerKey}
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

      {isOwn && pending.length > 0 && (
        <section className="space-y-2">
          <h3 className="m-0 text-bb-sm font-semibold text-bb-heading">
            {t('institutions.pendingOnProfile')}
          </h3>
          <ul className="m-0 list-none space-y-2 p-0">
            {pending.map((inst) => (
              <li
                key={inst.id}
                className="bb-card flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-bb-sm font-medium text-bb-heading">{inst.name}</div>
                  <div className="text-bb-xs text-bb-muted">
                    {t(`institutions.type.${inst.type}`)} · {t('institutions.status.pending')}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={cancelingId === inst.id}
                  onClick={() => onCancelPending(inst.id)}
                >
                  {t('institutions.cancelRequest')}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length === 0 ? (
        <div className="rounded-[1.25rem] border border-bb-border p-8 text-center text-bb-sm text-bb-muted">
          {t('institutions.empty')}
        </div>
      ) : (
        <ul className={INSTITUTION_CARD_GRID}>
          {list.map((inst) => (
            <InstitutionCard key={inst.id} institution={inst} />
          ))}
        </ul>
      )}
    </div>
  )
}
