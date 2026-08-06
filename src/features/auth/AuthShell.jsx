import { SiteLogo } from '../../layout/SiteLogo'

/** Cadre d’auth AfrEA-YEE — marque + barre horizon + carte. */
export function AuthShell({ title, hint, children, footer }) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center py-10">
      <div className="bb-fade-in mb-6 flex flex-col items-center text-center">
        <SiteLogo href="/" />
      </div>

      <div className="bb-auth-shell bb-fade-in-delay px-5 py-7 sm:px-7">
        <h1 className="font-display m-0 mb-2 text-bb-2xl font-semibold text-bb-heading">{title}</h1>
        {hint ? <p className="m-0 mb-6 text-bb-sm leading-relaxed text-bb-muted">{hint}</p> : null}
        {children}
      </div>

      {footer ? <div className="bb-fade-in-delay mt-5">{footer}</div> : null}
    </div>
  )
}
