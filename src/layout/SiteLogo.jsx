import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

/**
 * Marque AfrEA-YEE — destinée à la sidebar.
 * `compact` : pastille « AY » (panel replié)
 * `as="span"` : rendu non-lien (ex. bouton parent qui ouvre le panel)
 */
export function SiteLogo({ className = '', href = '/', compact = false, as }) {
  const { t } = useTranslation()
  const title = t('app.name')

  if (compact) {
    const badgeClass = clsx(
      'inline-flex h-9 w-9 items-center justify-center rounded-bb-inner bg-bb-primary text-bb-xs font-bold tracking-wide text-white',
      className,
    )
    if (as === 'span') {
      return (
        <span className={badgeClass} title={t('app.tagline')}>
          AY
        </span>
      )
    }
    return (
      <Link to={href} rel="home" title={t('app.tagline')} className={badgeClass}>
        AY
      </Link>
    )
  }

  return (
    <div id="site-logo" className={clsx('site-branding min-w-0', className)}>
      <Link to={href} rel="home" className="group flex min-w-0 items-center gap-2.5" title={t('app.tagline')}>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-bb-inner bg-bb-primary text-bb-xs font-bold tracking-wide text-white">
          AY
        </span>
        <span className="min-w-0">
          <span className="block truncate text-bb-md font-semibold tracking-tight text-bb-heading group-hover:text-bb-primary">
            {title}
          </span>
          <span className="block truncate text-[11px] leading-tight text-bb-muted">{t('app.tagline')}</span>
        </span>
      </Link>
    </div>
  )
}
