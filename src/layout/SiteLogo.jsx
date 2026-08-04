import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Marque AfrEA-YEE uniquement — sans logo SVG « Boss Theme » */
export function SiteLogo({ className = '', href = '/' }) {
  const { t } = useTranslation()
  const title = t('app.name')

  return (
    <div id="site-logo" className={`site-branding shrink-0 ${className}`}>
      <div className="site-title">
        <Link
          to={href}
          rel="home"
          className="inline-flex items-center"
          title={t('app.tagline')}
        >
          <span className="text-bb-md font-semibold tracking-tight text-bb-heading">{title}</span>
        </Link>
      </div>
    </div>
  )
}
