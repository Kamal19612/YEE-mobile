import { useTranslation } from 'react-i18next'
import { ClubsSection } from './ClubsSection'

/** Page Institutions — liste des clubs uniquement. */
export function InstitutionsPage() {
  const { t } = useTranslation()

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <header className="mb-4">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('institutions.title')}</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('institutions.subtitle')}</p>
      </header>

      <ClubsSection />
    </div>
  )
}
