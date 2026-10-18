import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createInstitution } from '../../api/institutions'
import { IconSearch } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import {
  useClubs,
  useContinents,
  useCountries,
  useReferentCountries,
} from '../../hooks/useInstitutions'
import {
  INSTITUTION_CARD_GRID,
  InstitutionCard,
  InstitutionCardActions,
  InstitutionCardSkeleton,
} from './InstitutionCard'

const NEW_OPTION = '__new__'

function mapClubError(err, t) {
  const code = err?.code || err?.body?.error?.code
  if (code === 'has_children') {
    return err?.message || t('institutions.errors.hasChildren')
  }
  if (code === 'forbidden') return t('institutions.errors.forbidden')
  if (code === 'last_referent') return t('institutions.errors.lastReferent')
  return err?.message || t('institutions.clubs.actionFailed')
}

function ClubFormFields({
  initial = {},
  countries = [],
  continents = [],
  allowHierarchyCreate = false,
  busy,
  error,
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const { t } = useTranslation()
  const [continentId, setContinentId] = useState('')
  const [newContinentName, setNewContinentName] = useState('')
  const [parentId, setParentId] = useState(initial.parentId || '')
  const [newCountryName, setNewCountryName] = useState('')
  const [name, setName] = useState(initial.name || '')
  const [description, setDescription] = useState(initial.description || '')

  const countriesForContinent = useMemo(() => {
    if (!allowHierarchyCreate || !continentId || continentId === NEW_OPTION) {
      return countries
    }
    return countries.filter((c) => String(c.parentId) === String(continentId))
  }, [allowHierarchyCreate, continentId, countries])

  const noCountriesYet = allowHierarchyCreate && countries.length === 0
  const creatingCountry = allowHierarchyCreate && (parentId === NEW_OPTION || noCountriesYet)
  const creatingContinent = allowHierarchyCreate && continentId === NEW_OPTION
  const needsContinent =
    allowHierarchyCreate && (creatingCountry || noCountriesYet || creatingContinent)

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (trimmed.length < 2 || trimmed.length > 120) return
        if (!creatingCountry && !parentId) return
        if (creatingCountry && newCountryName.trim().length < 2) return
        if (needsContinent && !continentId) return
        if (creatingContinent && newContinentName.trim().length < 2) return

        const country = countries.find((c) => String(c.id) === String(parentId))
        const continent = continents.find((c) => String(c.id) === String(continentId))
        onSubmit({
          name: trimmed,
          description: description.trim(),
          parentId: creatingCountry ? undefined : parentId || undefined,
          createCountry: creatingCountry
            ? {
                name: newCountryName.trim(),
                parentId: creatingContinent ? undefined : continentId,
                continentName: creatingContinent
                  ? newContinentName.trim()
                  : continent?.name || null,
              }
            : null,
          createContinent: creatingContinent ? { name: newContinentName.trim() } : null,
          countryName: creatingCountry ? newCountryName.trim() : (country?.name ?? null),
          continentName: creatingContinent
            ? newContinentName.trim()
            : (country?.continentName ?? continent?.name ?? null),
        })
      }}
    >
      {allowHierarchyCreate && needsContinent && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
              {t('institutions.clubs.continent')}
            </span>
            <select
              required
              value={continentId}
              onChange={(e) => {
                setContinentId(e.target.value)
                if (!noCountriesYet) setParentId('')
              }}
              disabled={busy}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
            >
              <option value="">{t('institutions.clubs.selectContinent')}</option>
              {continents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_OPTION}>{t('institutions.clubs.newContinent')}</option>
            </select>
          </label>
          {creatingContinent && (
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
                {t('institutions.clubs.continentName')}
              </span>
              <input
                value={newContinentName}
                onChange={(e) => setNewContinentName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
                disabled={busy}
                placeholder={t('institutions.clubs.continentNamePlaceholder')}
                className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
              />
            </label>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {!noCountriesYet && (
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
              {t('institutions.clubs.country')}
            </span>
            <select
              required
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={busy || (allowHierarchyCreate && needsContinent && !continentId && creatingCountry)}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
            >
              <option value="">{t('institutions.clubs.selectCountry')}</option>
              {(allowHierarchyCreate ? countriesForContinent : countries).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.continentName ? `${c.name} — ${c.continentName}` : c.name}
                </option>
              ))}
              {allowHierarchyCreate && (
                <option value={NEW_OPTION}>{t('institutions.clubs.newCountry')}</option>
              )}
            </select>
          </label>
        )}
        {creatingCountry && (
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
              {t('institutions.clubs.countryName')}
            </span>
            <input
              value={newCountryName}
              onChange={(e) => setNewCountryName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              disabled={busy}
              placeholder={t('institutions.clubs.countryNamePlaceholder')}
              className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </label>
        )}
        <label className="block min-w-0 flex-[2]">
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
            {t('institutions.clubs.name')}
          </span>
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
        <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
          {t('institutions.clubs.description')}
        </span>
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

function EditClubFormFields({
  initial = {},
  busy,
  error,
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial.name || '')
  const [description, setDescription] = useState(initial.description || '')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (trimmed.length < 2 || trimmed.length > 120) return
        onSubmit({ name: trimmed, description: description.trim() })
      }}
    >
      <label className="block">
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
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { clubs, loading, error, actionError, createClub, updateClub, deleteClub, clearActionError } =
    useClubs({ search })
  const { user } = useAuth()
  const isSiteAdmin = Boolean(user?.isSiteAdmin)
  const { countries: referentCountries, loading: referentLoading } = useReferentCountries(
    Boolean(user) && !isSiteAdmin,
  )
  const {
    countries: allCountries,
    loading: allCountriesLoading,
    reload: reloadCountries,
  } = useCountries(isSiteAdmin)
  const {
    continents,
    loading: continentsLoading,
    reload: reloadContinents,
  } = useContinents(isSiteAdmin)

  const countriesLoading = isSiteAdmin ? allCountriesLoading || continentsLoading : referentLoading
  const createCountries = isSiteAdmin ? allCountries : referentCountries
  // Admins : bouton visible même sans pays (ils peuvent créer continent → pays → club)
  const canCreate =
    Boolean(user) && !countriesLoading && (isSiteAdmin || createCountries.length > 0)

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
            data-testid="create-club-button"
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

      {!countriesLoading && user && !canCreate && (
        <p className="m-0 text-bb-sm text-bb-muted">{t('institutions.clubs.createReferentOnly')}</p>
      )}

      {createOpen && canCreate && (
        <div className="rounded-[1.25rem] border border-bb-border bg-bb-content p-4">
          <ClubFormFields
            countries={createCountries}
            continents={continents}
            allowHierarchyCreate={isSiteAdmin}
            submitLabel={t('common.create')}
            busy={formBusy}
            error={formError}
            onCancel={closeForms}
            onSubmit={async (payload) => {
              setFormBusy(true)
              setFormError(null)
              try {
                let parentId = payload.parentId
                let countryName = payload.countryName
                let continentName = payload.continentName

                if (payload.createContinent) {
                  const continent = await createInstitution({
                    name: payload.createContinent.name,
                    type: 'continent',
                  })
                  continentName = continent.name
                  if (payload.createCountry) {
                    payload.createCountry.parentId = continent.id
                  }
                  reloadContinents?.()
                }

                if (payload.createCountry) {
                  if (!payload.createCountry.parentId) {
                    throw new Error(t('institutions.clubs.continentRequired'))
                  }
                  const country = await createInstitution({
                    name: payload.createCountry.name,
                    type: 'country',
                    parentId: payload.createCountry.parentId,
                  })
                  parentId = country.id
                  countryName = country.name
                  continentName = payload.createCountry.continentName || continentName
                  reloadCountries?.()
                }

                if (!parentId) {
                  throw new Error(t('institutions.clubs.selectCountry'))
                }

                await createClub({
                  name: payload.name,
                  description: payload.description,
                  parentId,
                  countryName,
                  continentName,
                })
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
        <ul className={INSTITUTION_CARD_GRID}>
          {Array.from({ length: 8 }).map((_, i) => (
            <InstitutionCardSkeleton key={i} />
          ))}
        </ul>
      )}

      {!loading && !error && clubs.length === 0 && (
        <p className="m-0 py-8 text-center text-bb-sm text-bb-muted">{t('institutions.clubs.empty')}</p>
      )}

      {!loading && clubs.length > 0 && (
        <ul className={INSTITUTION_CARD_GRID}>
          {clubs.map((club) => {
            const isEditing = editingId === club.id
            const busy = rowBusy === club.id

            if (isEditing) {
              return (
                <li
                  key={club.id}
                  className="col-span-full list-none rounded-bb border border-bb-border bg-bb-content p-4 shadow-card"
                >
                  <EditClubFormFields
                    initial={club}
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
                        onClick={() => setDeleteTarget(club)}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('common.delete')}
        body={t('institutions.clubs.deleteConfirm', { name: deleteTarget?.name || '' })}
        confirmLabel={t('common.delete')}
        confirming={Boolean(deleteTarget && rowBusy === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setRowBusy(deleteTarget.id)
          clearActionError?.()
          try {
            await deleteClub(deleteTarget.id)
            setDeleteTarget(null)
          } catch {
            /* actionError */
          } finally {
            setRowBusy(null)
          }
        }}
      />
    </div>
  )
}
