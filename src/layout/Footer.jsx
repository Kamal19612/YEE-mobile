import { useTranslation } from 'react-i18next'
import { footerLinkDefs } from '../data/layoutData'

/** Référence: template-parts/footer.php */
export function Footer({ links = footerLinkDefs }) {
  const { t } = useTranslation()
  const copyright = t('app.copyright', { year: new Date().getFullYear() })

  return (
    <footer className="footer-bottom bb-footer style-1 border-t border-bb-border/80">
      <div className="bb-container flex flex-col items-center justify-between gap-3 py-6 bb:flex-row">
        <div className="footer-bottom-left text-bb-sm text-bb-footer-text">{copyright}</div>
        <ul className="footer-menu m-0 flex list-none flex-wrap items-center justify-center gap-4 p-0">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                className="text-bb-sm text-[var(--bb-footer-menu-link-color-regular)] transition-colors hover:text-[var(--bb-footer-menu-link-color-hover)]"
              >
                {t(link.labelKey)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
