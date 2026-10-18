import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher'
import fondYee from '../../assets/brand/fond-yee-network.jpg'

/**
 * Cadre d’auth plein écran — carte split (photo marque + formulaire).
 * Coins de carte unifiés (overflow + radius) ; image en cover.
 */
export function AuthShell({ title, hint, children, footer }) {
  return (
    <div className="bb-auth-shell relative flex min-h-dvh w-full flex-col items-center overflow-x-clip bg-white px-3 py-6 sm:px-6 sm:py-10 lg:py-12">
      <div className="bb-auth-card bb-fade-in relative grid w-full max-w-[1080px] overflow-hidden bb:grid-cols-2 bb:items-stretch">
        <aside className="bb-auth-panel relative overflow-hidden">
          <img
            src={fondYee}
            alt="YEE network — L'évaluation africaine racontée par sa jeunesse"
            width={1400}
            height={1272}
            decoding="async"
            className="bb-auth-panel-img"
          />
        </aside>

        <main className="relative z-[1] flex min-w-0 flex-col justify-center bg-white px-4 py-6 sm:px-9 sm:py-10 lg:px-12">
          <div className="mb-5 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="bb-fade-in-delay w-full max-w-md bb:max-w-none">
            <h1 className="font-display m-0 mb-2 text-[1.75rem] font-bold tracking-tight text-bb-heading sm:text-[2rem]">
              {title}
            </h1>
            {hint ? (
              <p className="m-0 mb-7 text-bb-sm leading-relaxed text-bb-muted sm:text-bb-base">{hint}</p>
            ) : (
              <div className="mb-7" />
            )}
            {children}

            {footer ? (
              <div className="bb-auth-mobile-footer mt-8 border-t border-bb-border pt-5 text-center text-bb-sm text-bb-muted">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
