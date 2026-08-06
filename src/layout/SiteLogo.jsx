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

  const mark = (
    <span
      className={clsx(
        'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-bb-inner bg-bb-primary text-bb-xs font-bold tracking-wide text-white shadow-[0_6px_14px_rgba(47,91,255,0.28)]',
        compact && className,
      )}
    >
      AY
      <span
        className="absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-bb-accent"
        aria-hidden="true"
      />
    </span>
  )

  if (compact) {
    if (as === 'span') {
      return (
        <span className={clsx('inline-flex', className)} title={t('app.tagline')}>
          {mark}
        </span>
      )
    }
    return (
      <Link to={href} rel="home" title={t('app.tagline')} className={clsx('inline-flex', className)}>
        {mark}
      </Link>
    )
  }

  return (
    <div id="site-logo" className={clsx('site-branding min-w-0', className)}>
      <Link
        to={href}
        rel="home"
        className="group flex min-w-0 items-center gap-2.5"
        title={t('app.tagline')}
      >
        {mark}
        <span className="min-w-0">
          <span className="font-display block truncate text-bb-md font-semibold tracking-tight text-bb-heading transition-colors group-hover:text-bb-primary">
            {title}
          </span>
          <span className="block truncate text-[11px] leading-tight text-bb-muted">
            {t('app.tagline')}
          </span>
        </span>
      </Link>
    </div>
  )
}
