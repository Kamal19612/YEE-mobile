import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import logoYee from '../assets/brand/logo-yee-network.png'

/**
 * Marque YEE network — logo officiel (ovale bleu).
 *
 * Cadre (`site-logo-frame`) qui borne la taille ; image en `object-contain`
 * pour rester entière sur desktop, rail replié et mobile.
 *
 * `compact` : rail sidebar replié
 * `as="span"` : rendu non-lien (ex. bouton parent)
 * `size` : sm | md | lg (hors mode fill)
 * `fill` : remplit le conteneur parent (hauteur + largeur imposées par le parent)
 * `variant="onDark"` : ombre / pastille pour fond sombre
 */
export function SiteLogo({
  className = '',
  href = '/',
  compact = false,
  as,
  size = 'md',
  variant = 'default',
  fill = false,
}) {
  const { t } = useTranslation()
  const title = t('app.name')
  const onDark = variant === 'onDark'

  const frameClass = clsx(
    'site-logo-frame relative flex max-w-full items-center overflow-hidden',
    fill ? 'h-full w-full min-h-0 min-w-0 justify-start' : 'justify-center',
    !fill && compact && 'h-8 w-[3.5rem]',
    !fill && !compact && size === 'sm' && 'h-9 w-[8.75rem] max-w-full',
    !fill && !compact && size === 'md' && 'h-10 w-[10rem] max-w-full sm:h-11 sm:w-[11.25rem]',
    !fill && !compact && size === 'lg' && 'h-12 w-[12.5rem] max-w-full sm:h-14 sm:w-[14.375rem]',
    onDark && 'rounded-full bg-white/10 p-1 ring-1 ring-white/25 backdrop-blur-sm',
  )

  const mark = (
    <span className={frameClass}>
      <img
        src={logoYee}
        alt=""
        width={635}
        height={323}
        decoding="async"
        className={clsx(
          'site-logo-img pointer-events-none block h-auto max-h-full w-auto max-w-full object-contain object-center',
          onDark && 'drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]',
        )}
      />
    </span>
  )

  const shellClass = clsx(
    'site-branding flex min-h-0 min-w-0 max-w-full items-center',
    fill && 'h-full w-full',
    className,
  )

  if (as === 'span') {
    return (
      <span className={shellClass} title={t('app.tagline')} role="img" aria-label={title}>
        {mark}
      </span>
    )
  }

  return (
    <div id={compact || fill ? undefined : 'site-logo'} className={shellClass}>
      <Link
        to={href}
        rel="home"
        title={t('app.tagline')}
        aria-label={title}
        className={clsx(
          'flex min-h-0 min-w-0 max-w-full items-center',
          fill ? 'h-full w-full' : 'w-full',
        )}
      >
        {mark}
      </Link>
    </div>
  )
}
