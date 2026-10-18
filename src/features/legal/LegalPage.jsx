import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const PAGES = new Set(['about', 'privacy', 'terms', 'contact'])

/**
 * Pages institutionnelles minimales (pied de page).
 * Contenu à remplacer par le texte juridique AfrEA avant ouverture publique.
 */
export function LegalPage() {
  const { pageId } = useParams()
  const { t } = useTranslation()

  if (!PAGES.has(pageId)) {
    return <Navigate to="/" replace />
  }

  const title = t(`legal.${pageId}.title`)
  const paragraphs = t(`legal.${pageId}.body`, { returnObjects: true })
  const lines = Array.isArray(paragraphs) ? paragraphs : [String(paragraphs)]

  return (
    <article className="bb-card mx-auto max-w-content p-6 bb:p-8">
      <p className="m-0 mb-2 text-bb-xs text-bb-muted">
        <Link to="/" className="text-bb-primary hover:underline">
          {t('common.back')}
        </Link>
      </p>
      <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{title}</h1>
      <div className="mt-4 space-y-3 text-bb-sm leading-relaxed text-bb-text">
        {lines.map((line) => (
          <p key={line} className="m-0">
            {line}
          </p>
        ))}
      </div>
    </article>
  )
}
