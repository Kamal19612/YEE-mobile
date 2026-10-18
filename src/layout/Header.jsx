import { useLayout } from '../context/LayoutProvider'
import { HeaderAside } from './HeaderAside'
import { HeaderSearch } from './HeaderSearch'
import { SiteLogo } from './SiteLogo'

/**
 * Header desktop — sticky dans la colonne contenu (à droite du BuddyPanel).
 *
 * Règle de marque (logo ovale horizontal) :
 * - Panel ouvert  → logo dans BuddyPanel uniquement (pas ici)
 * - Panel replié  → logo ici seulement ; le symbole sidebar reste dans le rail
 */
export function Header() {
  const { panelOpen } = useLayout()

  return (
    <>
      <header
        id="masthead"
        className="site-header site-header--bb sticky top-0 z-header hidden h-header border-b border-bb-border bb-surface-glass bb:block"
      >
        <div className="bb-container flex h-header items-center gap-3">
          {!panelOpen ? (
            <div className="flex h-10 min-w-0 flex-1 items-center overflow-hidden">
              <SiteLogo fill className="h-full w-auto max-w-[min(100%,12rem)]" />
            </div>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden="true" />
          )}
          <HeaderAside />
        </div>
      </header>
      <HeaderSearch />
    </>
  )
}
