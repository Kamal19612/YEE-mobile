import { footerLinks } from '../data/demoData'

/** Référence: template-parts/footer.php */
export function Footer({
  copyright = `© ${new Date().getFullYear()} BuddyBoss Community`,
  links = footerLinks,
}) {
  return (
    <footer className="footer-bottom bb-footer style-1 border-t border-bb-border bg-bb-footer">
      <div className="bb-container flex flex-col items-center justify-between gap-3 py-5 bb:flex-row">
        <div className="footer-bottom-left text-bb-sm text-bb-footer-text">{copyright}</div>
        <ul className="footer-menu m-0 flex list-none flex-wrap items-center justify-center gap-4 p-0">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                className="text-bb-sm text-[var(--bb-footer-menu-link-color-regular)] hover:text-[var(--bb-footer-menu-link-color-hover)]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
