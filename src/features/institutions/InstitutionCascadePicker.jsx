import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchInstitution } from '../../api/institutions'
import { useInstitutionTree } from '../../hooks/useInstitutions'

/**
 * Sélecteur en cascade continent → pays → club local.
 * Chaque niveau se charge à la demande (pas d’arbre entier).
 *
 * `value` = id de l’institution sélectionnée.
 * `depth` = 'local' (feuille club, défaut) ou 'country' (filtre annuaire).
 */
export function InstitutionCascadePicker({
  value = null,
  onChange,
  disabled = false,
  depth = 'local',
  className,
  compact = false,
}) {
  const { t } = useTranslation()
  const [continentId, setContinentId] = useState('')
  const [countryId, setCountryId] = useState('')
  const [localId, setLocalId] = useState('')
  const continents = useInstitutionTree(null)
  const countries = useInstitutionTree(continentId || null, 'country')
  const locals = useInstitutionTree(countryId || null, 'local')
  const stopAtCountry = depth === 'country'

  useEffect(() => {
    if (!value) {
      setContinentId('')
      setCountryId('')
      setLocalId('')
      return undefined
    }
    const current = stopAtCountry ? countryId : localId
    if (String(current) === String(value)) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const inst = await fetchInstitution(value)
        if (cancelled || !inst) return
        if (inst.type === 'continent') {
          setContinentId(inst.id)
          setCountryId('')
          setLocalId('')
        } else if (inst.type === 'country') {
          setContinentId(inst.parentId || '')
          setCountryId(inst.id)
          setLocalId('')
        } else {
          setLocalId(inst.id)
          setCountryId(inst.parentId || '')
          if (inst.parentId) {
            const country = await fetchInstitution(inst.parentId)
            if (!cancelled) setContinentId(country?.parentId || '')
          }
        }
      } catch {
        /* ignore hydrate errors */
      } finally {
        /* hydrate done */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [value, stopAtCountry])

  function pickContinent(id) {
    setContinentId(id)
    setCountryId('')
    setLocalId('')
    onChange?.(null)
  }

  function pickCountry(id) {
    setCountryId(id)
    setLocalId('')
    if (stopAtCountry) {
      const inst = countries.institutions.find((i) => String(i.id) === String(id))
      onChange?.(inst || (id ? { id } : null))
    } else {
      onChange?.(null)
    }
  }

  function pickLocal(id) {
    setLocalId(id)
    const inst = locals.institutions.find((i) => String(i.id) === String(id))
    onChange?.(inst || (id ? { id } : null))
  }

  const selectClass =
    'h-10 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary disabled:opacity-60'
  const labelClass = compact
    ? 'sr-only'
    : 'mb-1.5 block text-bb-sm font-medium text-bb-heading'
  const stackClass = compact
    ? 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'
    : 'space-y-3'

  return (
    <div className={className ? `${stackClass} ${className}` : stackClass}>
      <label className={compact ? 'block min-w-0 flex-1 sm:min-w-[160px]' : 'block'}>
          <span className={labelClass}>{t('institutions.type.continent')}</span>
        <select
          className={selectClass}
          disabled={disabled || continents.loading}
          value={continentId}
          onChange={(e) => pickContinent(e.target.value)}
        >
          <option value="">{t('institutions.cascade.selectContinent')}</option>
          {continents.institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {continents.error && (
          <span className="mt-1 block text-bb-xs text-bb-danger">{continents.error}</span>
        )}
      </label>

      <label className={compact ? 'block min-w-0 flex-1 sm:min-w-[160px]' : 'block'}>
        <span className={labelClass}>{t('institutions.type.country')}</span>
        <select
          className={selectClass}
          disabled={disabled || !continentId || countries.loading}
          value={countryId}
          onChange={(e) => pickCountry(e.target.value)}
        >
          <option value="">{t('institutions.cascade.selectCountry')}</option>
          {countries.institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        {countries.error && (
          <span className="mt-1 block text-bb-xs text-bb-danger">{countries.error}</span>
        )}
        {!countries.loading && continentId && countries.institutions.length === 0 && (
          <span className="mt-1 block text-bb-xs text-bb-muted">
            {t('institutions.children.emptyCountries')}
          </span>
        )}
      </label>

      {!stopAtCountry && (
        <label className={compact ? 'block min-w-0 flex-1 sm:min-w-[160px]' : 'block'}>
          <span className={labelClass}>{t('institutions.type.local')}</span>
          <select
            className={selectClass}
            disabled={disabled || !countryId || locals.loading}
            value={localId}
            onChange={(e) => pickLocal(e.target.value)}
          >
            <option value="">{t('institutions.cascade.selectLocal')}</option>
            {locals.institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          {locals.error && (
            <span className="mt-1 block text-bb-xs text-bb-danger">{locals.error}</span>
          )}
          {!locals.loading && countryId && locals.institutions.length === 0 && (
            <span className="mt-1 block text-bb-xs text-bb-muted">
              {t('institutions.children.emptyLocals')}
            </span>
          )}
        </label>
      )}
    </div>
  )
}
