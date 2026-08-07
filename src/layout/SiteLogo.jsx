import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import logoYee from '../assets/brand/logo-yee-network.png'

/**
 * Marque YEE network — logo officiel (ovale bleu).
 * `compact` : version réduite (panel replié)
 * `as="span"` : rendu non-lien (ex. bouton parent qui ouvre le panel)
 * `size="lg"` : plus grand (auth)
 * `variant="onDark"` : ombre pour fond sombre
 */
export function SiteLogo({
  className = '',
  href = '/',
  compact = false,
  as,
  size = 'md',
  variant = 'default',
}) {
  const { t } = useTranslation()
  const title = t('app.name')
  const onDark = variant === 'onDark'

  const imgClass = clsx(
    'block h-auto w-auto object-contain',
    compact && 'h-8 max-w-[56px]',
    !compact && size === 'sm' && 'h-9 max-w-[140px]',
    !compact && size === 'md' && 'h-10 max-w-[160px] sm:h-11 sm:max-w-[180px]',
    !compact && size === 'lg' && 'h-12 max-w-[200px] sm:h-14 sm:max-w-[230px]',
    onDark && 'drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]',
  )

  const mark = (
    <img
      src={logoYee}
      alt={title}
      width={635}
      height={323}
      decoding="async"
      className={imgClass}
    />
  )

  if (compact) {
    if (as === 'span') {
      return (
        <span className={clsx('inline-flex items-center', className)} title={t('app.tagline')}>
          {mark}
        </span>
      )
    }
    return (
      <Link to={href} rel="home" title={t('app.tagline')} className={clsx('inline-flex items-center', className)}>
        {mark}
      </Link>
    )
  }

  return (
    <div id="site-logo" className={clsx('site-branding min-w-0', className)}>
      <Link
        to={href}
        rel="home"
        className={clsx(
          'inline-flex items-center',
          onDark && 'rounded-full bg-white/10 p-1.5 ring-1 ring-white/25 backdrop-blur-sm',
        )}
        title={t('app.tagline')}
      >
        {mark}
      </Link>
    </div>
  )
}
