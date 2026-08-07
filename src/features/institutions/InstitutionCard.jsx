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

/** Hero détail — même structure que ProfileHeader (cover + avatar + infos). */
export function InstitutionHero({ institution, actions = null, backLink }) {
  const { t } = useTranslation()
  const loc = institutionLocation(institution)
  const status = institution.viewerAffiliationStatus
  const logoSrc = institution.avatarUrl || institution.coverUrl

  return (
    <div className="space-y-3">
      {backLink ? <div className="w-full">{backLink}</div> : null}

      <div
        id="item-header"
        role="complementary"
        data-bp-item-id={institution.id}
        data-bp-item-component="institutions"
        className="users-header single-headers overflow-hidden rounded-bb border border-bb-border bg-bb-content"
      >
        <div className="relative z-0">
          <div id="header-cover-image" className="bb-item-header-cover">
            {institution.coverUrl ? (
              <img
                src={institution.coverUrl}
                alt=""
                className="bb-item-header-cover-img"
                decoding="async"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={institutionThemeCoverStyle()}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div id="item-header-cover-image" className="bb-item-header-body">
          <div className="flex flex-col gap-4 bb:flex-row bb:items-end">
            <div className="item-header-avatar bb-item-header-avatar">
              <Avatar
                name={institution.name || '?'}
                src={logoSrc}
                size="xl"
                className="!h-[104px] !w-[104px] ring-4 ring-bb-content sm:!h-[120px] sm:!w-[120px]"
              />
            </div>

            <div id="item-header-content" className="bb-item-header-content">
              <h1 className="user-nicename m-0 break-words text-bb-lg font-semibold text-bb-heading sm:text-bb-xl">
                {institution.name}
              </h1>
              <p className="m-0 mt-0.5 text-bb-sm text-bb-muted">
                {t(`institutions.type.${institution.type}`)}
                {loc ? ` · ${loc}` : ''}
              </p>
              {institution.description ? (
                <p className="m-0 mt-2 max-w-xl text-bb-sm text-bb-text">{institution.description}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>{t(`institutions.type.${institution.type}`)}</Chip>
                {institution.countryName ? <Chip>{institution.countryName}</Chip> : null}
                {institution.continentName ? <Chip>{institution.continentName}</Chip> : null}
                {status && status !== 'none' ? (
                  <Chip>{t(`institutions.status.${status}`)}</Chip>
                ) : null}
                {institution.viewerIsReferent ? (
                  <Chip>{t('institutions.referentBadge')}</Chip>
                ) : null}
              </div>
            </div>

            {actions ? (
              <div className="flex w-full flex-wrap gap-2 pb-1 bb:w-auto">{actions}</div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-bb-border pt-3 text-center sm:flex sm:flex-wrap sm:gap-6 sm:text-left">
            <Stat
              label={t('institutions.membersLabel')}
              value={institution.membersCount ?? 0}
            />
            <Stat
              label={t('institutions.typeLabel')}
              value={t(`institutions.type.${institution.type}`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Cover fiche institution — bleu uni du thème / logo YEE. */
function institutionThemeCoverStyle() {
  return {
    backgroundColor: 'var(--bb-primary-color)',
    backgroundImage: 'none',
  }
}

function Chip({ children }) {
  return (
    <span className="inline-flex rounded-bb-option bg-[var(--bb-label-background-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--bb-label-text-color)]">
      {children}
    </span>
  )
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-bb-md font-semibold text-bb-heading">{value}</div>
      <div className="truncate text-bb-xs text-bb-muted">{label}</div>
    </div>
  )
}

export function InstitutionCardActions({ children }) {
  return <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
}
