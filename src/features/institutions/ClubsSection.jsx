import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconSearch } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useClubs, useReferentCountries } from '../../hooks/useInstitutions'
import { InstitutionCard, InstitutionCardActions } from './InstitutionCard'

function mapClubError(err, t) {
  const code = err?.code || err?.body?.error?.code
  if (code === 'has_children') {
    return err?.message || t('institutions.errors.hasChildren')
  }
  if (code === 'forbidden') return t('institutions.errors.forbidden')
  return err?.message || t('institutions.clubs.actionFailed')
}

function ClubFormFields({
  initial = {},
  countries = [],
  showCountry,
  busy,
  error,
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const { t } = useTranslation()
  const [parentId, setParentId] = useState(initial.parentId || '')
  const [name, setName] = useState(initial.name || '')
  const [description, setDescription] = useState(initial.description || '')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (trimmed.length < 2 || trimmed.length > 120) return
        if (showCountry && !parentId) return
        const country = countries.find((c) => String(c.id) === String(parentId))
        onSubmit({
          name: trimmed,
          description: description.trim(),
          parentId: parentId || undefined,
          countryName: country?.name ?? null,
          continentName: country?.continentName ?? null,
        })
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        {showCountry && (
          <label className="block min-w-0 flex-1">
            <span className="sr-only">{t('institutions.clubs.country')}</span>
            <select
              required
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={busy}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
            >
              <option value="">{t('institutions.clubs.selectCountry')}</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.continentName ? `${c.name} — ${c.continentName}` : c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block min-w-0 flex-[2]">
          <span className="sr-only">{t('institutions.clubs.name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            disabled={busy}
            placeholder={t('institutions.clubs.namePlaceholder')}
            className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
          />
        </label>
      </div>
      <label className="block">
        <span className="sr-only">{t('institutions.clubs.description')}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          disabled={busy}
          placeholder={t('institutions.clubs.descriptionPlaceholder')}
          className="w-full rounded-bb-input border border-bb-border px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
        />
      </label>
      {error && (
        <p className="m-0 text-bb-sm text-bb-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? t('common.loading') : submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

/** Section Clubs — grille de cards transparentes (logo + description). */
export function ClubsSection() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const [rowBusy, setRowBusy] = useState(null)

  const { clubs, loading, error, actionError, createClub, updateClub, deleteClub, clearActionError } =
    useClubs({ search })
  const { user } = useAuth()
  const { countries: referentCountries, loading: referentLoading } = useReferentCountries(
    Boolean(user),
  )

  const canCreate = Boolean(user) && !referentLoading && referentCountries.length > 0

  const closeForms = () => {
    setCreateOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 w-full flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('institutions.clubs.search')}
            className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
          />
        </label>
        {canCreate && (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setCreateOpen((v) => !v)
              setEditingId(null)
              setFormError(null)
              clearActionError?.()
            }}
          >
            {t('institutions.clubs.create')}
          </Button>
        )}
      </div>

      {!referentLoading && user && referentCountries.length === 0 && (
        <p className="m-0 text-bb-sm text-bb-muted">{t('institutions.clubs.createReferentOnly')}</p>
      )}

      {createOpen && canCreate && (
        <div className="rounded-[1.25rem] border border-bb-border bg-bb-content p-4">
          <ClubFormFields
            showCountry
            countries={referentCountries}
            submitLabel={t('common.create')}
            busy={formBusy}
            error={formError}
            onCancel={closeForms}
            onSubmit={async (payload) => {
              setFormBusy(true)
              setFormError(null)
              try {
                await createClub(payload)
                closeForms()
              } catch (err) {
                setFormError(mapClubError(err, t))
              } finally {
                setFormBusy(false)
              }
            }}
          />
        </div>
      )}

      {(actionError || error) && (
        <p className="m-0 text-bb-sm text-bb-danger" role="alert">
          {actionError || error}
        </p>
      )}

      {loading && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="aspect-square animate-pulse rounded-bb border border-bb-border/50 bg-bb-content/40"
            />
          ))}
        </ul>
      )}

      {!loading && !error && clubs.length === 0 && (
        <p className="m-0 py-8 text-center text-bb-sm text-bb-muted">{t('institutions.clubs.empty')}</p>
      )}

      {!loading && clubs.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clubs.map((club) => {
            const isEditing = editingId === club.id
            const busy = rowBusy === club.id

            if (isEditing) {
              return (
                <li
                  key={club.id}
                  className="col-span-1 list-none rounded-bb border border-bb-border bg-bb-content/80 p-4 shadow-card backdrop-blur-sm sm:col-span-2 lg:col-span-3 xl:col-span-4"
                >
                  <ClubFormFields
                    initial={club}
                    showCountry={false}
                    submitLabel={t('common.save')}
                    busy={formBusy}
                    error={formError}
                    onCancel={closeForms}
                    onSubmit={async ({ name, description }) => {
                      setFormBusy(true)
                      setFormError(null)
                      try {
                        await updateClub(club.id, { name, description })
                        closeForms()
                      } catch (err) {
                        setFormError(mapClubError(err, t))
                      } finally {
                        setFormBusy(false)
                      }
                    }}
                  />
                </li>
              )
            }

            return (
              <InstitutionCard
                key={club.id}
                institution={club}
                actions={
                  club.viewerIsReferent ? (
                    <InstitutionCardActions>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(club.id)
                          setCreateOpen(false)
                          setFormError(null)
                          clearActionError?.()
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              t('institutions.clubs.deleteConfirm', { name: club.name }),
                            )
                          ) {
                            return
                          }
                          setRowBusy(club.id)
                          clearActionError?.()
                          try {
                            await deleteClub(club.id)
                          } catch {
                            /* actionError */
                          } finally {
                            setRowBusy(null)
                          }
                        }}
                      >
                        {t('common.delete')}
                      </Button>
                    </InstitutionCardActions>
                  ) : null
                }
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
