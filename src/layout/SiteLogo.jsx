import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import logoUrl from '../assets/svg/boss-theme-logo.svg'

export function SiteLogo({ className = '', href = '/' }) {
  const { t } = useTranslation()
  const title = t('app.name')

  return (
    <div id="site-logo" className={`site-branding shrink-0 ${className}`}>
      <div className="site-title">
        <Link to={href} rel="home" className="inline-flex items-center gap-2" title={t('app.tagline')}>
          <img src={logoUrl} alt="" className="bb-logo h-8 w-auto max-w-[120px]" aria-hidden="true" />
          <span className="text-bb-md font-semibold tracking-tight text-bb-heading">{title}</span>
        </Link>
      </div>
    </div>
  )
}
