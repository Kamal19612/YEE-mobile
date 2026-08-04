import { IconSidebar } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { HeaderAside } from './HeaderAside'
import { HeaderSearch } from './HeaderSearch'

/**
 * Header desktop — sticky dans la colonne contenu (à droite du BuddyPanel).
 * Même --bb-header-height et breakpoint bb: que la sidebar.
 */
export function Header({ isLoggedIn = true }) {
  const { togglePanel, panelOpen } = useLayout()

  return (
    <>
      <header
        id="masthead"
        className="site-header site-header--bb sticky top-0 z-header hidden h-header border-b border-bb-border bg-bb-header bb:block"
      >
        <div className="bb-container flex h-header items-center gap-3">
          {!panelOpen && (
            <button
              type="button"
              className="bb-toggle-panel flex h-10 w-10 shrink-0 items-center justify-center rounded-bb-inner text-bb-header-link hover:bg-bb-alt hover:text-bb-primary"
              onClick={togglePanel}
              aria-label="Ouvrir le panneau"
              aria-expanded={false}
            >
              <IconSidebar />
            </button>
          )}
          <div className="min-w-0 flex-1" aria-hidden="true" />
          <HeaderAside isLoggedIn={isLoggedIn} />
        </div>
      </header>
      <HeaderSearch />
    </>
  )
}
