import { Link } from 'react-router-dom'
import logoUrl from '../assets/svg/boss-theme-logo.svg'

export function SiteLogo({ className = '', title = 'BuddyBoss', href = '/' }) {
  return (
    <div id="site-logo" className={`site-branding shrink-0 ${className}`}>
      <div className="site-title">
        <Link to={href} rel="home" className="inline-flex items-center gap-2">
          <img src={logoUrl} alt={title} className="bb-logo h-8 w-auto max-w-[160px]" />
          <span className="sr-only">{title}</span>
        </Link>
      </div>
    </div>
  )
}
