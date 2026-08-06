import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { countryFlagUrl } from './countryFlag'

/** Couvertures géo — distinctes par institution, sans photo de profil. */
const COVER_PALETTES = [
  ['#1e4fd6', '#3d8bfd', '#e8b84a'],
  ['#0f6b5c', '#2bbbad', '#f0c75e'],
  ['#243b6b', '#5b7cfa', '#d4a017'],
  ['#1a5f7a', '#57c5b6', '#f4a261'],
  ['#2c4a7c', '#7eb6ff', '#c9a227'],
  ['#165a72', '#4ecdc4', '#ffe66d'],
]

function hashStr(s) {
  let h = 0
  const str = String(s || '')
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function institutionCoverStyle(institution) {
  if (institution?.coverUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(12,18,32,0.15) 0%, rgba(12,18,32,0.72) 58%, rgba(12,18,32,0.92) 100%), url(${institution.coverUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  const [a, b, c] =
    COVER_PALETTES[hashStr(institution?.id || institution?.name) % COVER_PALETTES.length]
  return {
    backgroundImage: `radial-gradient(circle at 30% 20%, ${c}66 0%, transparent 42%), linear-gradient(165deg, ${a} 0%, ${b} 48%, #121a2b 100%)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

export function institutionLocation(institution, { separator = ' · ' } = {}) {
  const parts = [institution?.countryName, institution?.continentName].filter(Boolean)
  return parts.length ? parts.join(separator) : null
}

/**
 * Aperçu club — card transparente carrée : drapeau, logo, nom / pays / membres.
 */
export function InstitutionCard({
  institution,
  actions = null,
  className,
}) {
  const { t } = useTranslation()
  const loc = institutionLocation(institution, { separator: ', ' })
  const membersLabel = t(
    institution.membersCount === 1
      ? 'institutions.membersCount_one'
      : 'institutions.membersCount_other',
    { count: institution.membersCount ?? 0 },
  )
  const logoSrc = institution.avatarUrl || institution.coverUrl
  const flagUrl = countryFlagUrl(institution.countryName, institution.countryCode)
  const flagAlt = institution.countryName
    ? t('institutions.clubs.countryFlag', { country: institution.countryName })
    : ''

  return (
    <li className={clsx('list-none flex w-full flex-col', className)}>
      <Link
        to={`/institutions/${institution.id}`}
        className="relative flex aspect-square w-full flex-col items-center overflow-hidden rounded-bb border border-bb-border bg-bb-content/40 px-4 pb-5 pt-6 text-center shadow-card outline-none backdrop-blur-md transition-[transform,box-shadow,border-color,background-color] duration-200 ease-bb hover:-translate-y-0.5 hover:border-bb-border hover:bg-bb-content/55 hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-bb-primary focus-visible:ring-offset-2"
      >
        {flagUrl ? (
          <img
            src={flagUrl}
            alt={flagAlt}
            title={institution.countryName || undefined}
            width={36}
            height={24}
            loading="lazy"
            decoding="async"
            className="absolute right-3 top-3 z-10 h-5 w-7 rounded-[2px] object-cover shadow-[0_1px_4px_rgba(18,26,43,0.18)]"
          />
        ) : institution.countryName ? (
          <span
            className="absolute right-3 top-3 z-10 h-5 w-7 rounded-[2px] bg-bb-alt"
            title={institution.countryName}
            aria-label={flagAlt}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
          <Avatar
            name={institution.name || '?'}
            src={logoSrc}
            size="xl"
            className="h-20 w-20 text-bb-md ring-2 ring-white/80 sm:h-24 sm:w-24"
          />
          <h3 className="m-0 mt-4 line-clamp-2 max-w-full text-bb-md font-bold leading-snug text-bb-heading">
            {institution.name || t('institutions.clubs.unnamed')}
          </h3>
          {loc ? (
            <p className="m-0 mt-1 line-clamp-1 max-w-full text-bb-sm text-bb-text">{loc}</p>
          ) : null}
          <p className="m-0 mt-0.5 text-bb-sm text-bb-text">{membersLabel}</p>
        </div>
      </Link>

      {actions ? <div className="mt-2">{actions}</div> : null}
    </li>
  )
}

/** Hero détail — grande bulle ronde avec cover + infos ; actions sous la bulle. */
export function InstitutionHero({ institution, actions = null, backLink }) {
  const { t } = useTranslation()
  const loc = institutionLocation(institution)
  const status = institution.viewerAffiliationStatus

  return (
    <div className="flex flex-col items-center gap-4">
      {backLink ? <div className="w-full self-start">{backLink}</div> : null}

      <div
        className="relative flex h-[220px] w-[220px] shrink-0 flex-col justify-end overflow-hidden rounded-full border border-white/20 px-5 pb-7 pt-8 text-center text-white shadow-[0_14px_40px_rgba(18,26,43,0.26)] sm:h-[240px] sm:w-[240px]"
        style={institutionCoverStyle(institution)}
      >
        <p className="m-0 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/75">
          {t(`institutions.type.${institution.type}`)}
          {loc ? ` · ${loc}` : ''}
        </p>
        <h1 className="m-0 mt-1 line-clamp-3 text-bb-lg font-semibold leading-tight text-white drop-shadow-sm">
          {institution.name}
        </h1>
        {institution.description ? (
          <p className="m-0 mt-1.5 line-clamp-2 text-bb-xs text-white/80">{institution.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.65rem] text-white/75">
          <span>
            {t(
              institution.membersCount === 1
                ? 'institutions.membersCount_one'
                : 'institutions.membersCount_other',
              { count: institution.membersCount },
            )}
          </span>
          {status && status !== 'none' && <span>{t(`institutions.status.${status}`)}</span>}
          {institution.viewerIsReferent && (
            <span className="font-semibold text-[#f0c75e]">{t('institutions.referentBadge')}</span>
          )}
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function InstitutionCardActions({ children }) {
  return <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
}
