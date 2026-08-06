import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher'
import { SiteLogo } from '../../layout/SiteLogo'

/**
 * Cadre d’auth plein écran (sans panel / header app) — marque + formulaire.
 * Desktop : panneau marque à gauche, carte à droite (référence Facebook).
 */
export function AuthShell({ title, hint, children, footer }) {
  const { t } = useTranslation()

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-bb-body lg:flex-row">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgba(var(--bb-primary-color-rgb),0.08)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[rgba(var(--bb-accent-color-rgb),0.12)] blur-3xl" />
      </div>

      <aside className="relative z-[1] flex flex-col justify-between px-6 py-8 sm:px-10 lg:w-[46%] lg:px-14 lg:py-12">
        <div className="flex items-start justify-between gap-4">
          <SiteLogo href="/login" />
          <LanguageSwitcher className="lg:hidden" />
        </div>

        <div className="bb-fade-in hidden max-w-md lg:mt-16 lg:block">
            <p className="font-display m-0 text-bb-2xl font-semibold leading-tight tracking-tight text-bb-heading xl:text-[2.35rem]">
              {t('auth.welcomeTitle')}
            </p>
          <p className="mt-4 m-0 text-bb-md leading-relaxed text-bb-text">{t('auth.welcomeBody')}</p>
        </div>

        <p className="mt-8 hidden text-bb-xs text-bb-muted lg:block">
          {t('app.copyright', { year: new Date().getFullYear() })}
        </p>
      </aside>

      <main className="relative z-[1] flex flex-1 flex-col justify-center px-4 pb-10 pt-2 sm:px-8 lg:px-12 lg:py-12">
        <div className="mb-4 flex justify-end lg:mb-6">
          <LanguageSwitcher className="hidden lg:inline-flex" />
        </div>

        <div className="bb-fade-in mx-auto w-full max-w-md lg:mx-0 lg:ml-auto lg:mr-[8%]">
          <div className="mb-5 lg:hidden">
            <p className="font-display m-0 text-bb-xl font-semibold text-bb-heading">{t('auth.welcomeTitle')}</p>
            <p className="mt-1.5 m-0 text-bb-sm text-bb-muted">{t('auth.welcomeBody')}</p>
          </div>

          <div className="bb-auth-shell bb-fade-in-delay px-5 py-7 sm:px-7">
            <h1 className="font-display m-0 mb-2 text-bb-2xl font-semibold text-bb-heading">{title}</h1>
            {hint ? <p className="m-0 mb-6 text-bb-sm leading-relaxed text-bb-muted">{hint}</p> : null}
            {children}
          </div>

          {footer ? <div className="bb-fade-in-delay mt-5">{footer}</div> : null}

          <p className="mt-8 text-center text-bb-xs text-bb-muted lg:hidden">
            {t('app.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </main>
    </div>
  )
}
