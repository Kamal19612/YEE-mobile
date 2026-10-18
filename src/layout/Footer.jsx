import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { footerLinkDefs } from '../data/layoutData'

export function Footer({ links = footerLinkDefs }) {
  const { t } = useTranslation()
  const copyright = t('app.copyright', { year: new Date().getFullYear() })

  return (
    <footer className="footer-bottom bb-footer style-1 border-t border-bb-border/80">
      <div className="bb-container flex flex-col items-center justify-between gap-3 pt-6 pb-[max(1.5rem,var(--bb-safe-bottom))] bb:flex-row">
        <div className="footer-bottom-left text-bb-sm text-bb-footer-text">{copyright}</div>
        <ul className="footer-menu m-0 flex list-none flex-wrap items-center justify-center gap-4 p-0">
          {links.map((link) => (
            <li key={link.id}>
              <Link
                to={link.href}
                className="text-bb-sm text-[var(--bb-footer-menu-link-color-regular)] transition-colors hover:text-[var(--bb-footer-menu-link-color-hover)]"
              >
                {t(link.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
