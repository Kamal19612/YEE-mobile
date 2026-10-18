import { useTranslation } from 'react-i18next'

/** Page placeholder pour modules non encore construits (Phase 1+) */
export function ComingSoonPage({ titleKey, description }) {
  const { t } = useTranslation()
  const title = titleKey ? t(titleKey) : t('common.comingSoon')

  return (
    <div className="bb-content-area w-full">
      <div className="rounded-bb border border-bb-border bg-bb-content p-8 shadow-card">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{title}</h1>
        <p className="mt-3 mb-0 text-bb-base text-bb-muted">
          {description || t('common.comingSoon')}
        </p>
      </div>
    </div>
  )
}
