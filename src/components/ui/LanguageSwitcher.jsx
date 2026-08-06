import { useTranslation } from 'react-i18next'
import clsx from 'clsx'

const LANGS = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]

export function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const current = (i18n.language || 'fr').slice(0, 2)

  return (
    <div
      className={clsx(
        'inline-flex items-center rounded-bb-inner border border-bb-border bg-bb-alt p-0.5 text-bb-xs font-semibold',
        className,
      )}
      role="group"
      aria-label={t('common.language')}
    >
      {LANGS.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          className={clsx(
            'rounded-[4px] px-2 py-1 transition-colors',
            current === lang.code
              ? 'bg-bb-content text-bb-primary shadow-sm'
              : 'text-bb-muted hover:text-bb-heading',
          )}
          aria-pressed={current === lang.code}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
