import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { RESOURCE_LANGUAGES } from '../../data/resourcesData'
import { deleteResource } from '../../api/resources'
import { useAuth } from '../../hooks/useAuth'
import { useResource } from '../../hooks/useResources'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { ResourceDocumentCard } from './ResourceDocumentCard'

function languageLabel(t, code) {
  const found = RESOURCE_LANGUAGES.find((l) => l.code === code)
  return found ? t(found.labelKey) : code
}

/** Fiche ressource — même carte document que le fil. */
export function ResourceDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { resourceId } = useParams()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isSiteAdmin)
  const { resource, loading, error } = useResource(resourceId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  if (loading) {
    return <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
  }

  if (error || !resource) {
    return (
      <div className="space-y-3">
        <p className="m-0 text-bb-sm text-bb-danger">{t('resources.notFound')}</p>
        <Button as={Link} to="/resources" size="sm" variant="outline">
          {t('resources.back')}
        </Button>
      </div>
    )
  }

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <p className="m-0 mb-3">
        <Link to="/resources" className="text-bb-sm text-bb-primary hover:underline">
          {t('resources.back')}
        </Link>
      </p>

      <header className="mb-4">
        <p className="m-0 text-bb-xs font-semibold uppercase tracking-wide text-bb-muted">
          {resource.categoryName || resource.categorySlug} · {languageLabel(t, resource.language)}
        </p>
        <h1 className="m-0 mt-1 text-bb-xl font-semibold text-bb-heading">{resource.title}</h1>
      </header>

      {deleteError && <p className="mb-3 text-bb-sm text-bb-danger">{deleteError}</p>}

      <ResourceDocumentCard
        resource={resource}
        meta={`${resource.categoryName || resource.categorySlug} · ${languageLabel(t, resource.language)}`}
        showDelete={isAdmin}
        deleting={deleting}
        eagerPreview
        onDelete={() => {
          setDeleteError(null)
          setConfirmDelete(true)
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t('resources.deleteConfirmTitle')}
        body={t('resources.deleteConfirmBody', { title: resource.title })}
        confirmLabel={t('resources.delete')}
        cancelLabel={t('common.cancel')}
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false)
        }}
        onConfirm={async () => {
          setDeleting(true)
          setDeleteError(null)
          try {
            await deleteResource(resource.id)
            invalidate(QueryKeys.resources, { reason: 'delete', resourceId: resource.id })
            setConfirmDelete(false)
            navigate('/resources', { replace: true })
          } catch (err) {
            setDeleteError(err.message || t('resources.deleteFailed'))
            setConfirmDelete(false)
          } finally {
            setDeleting(false)
          }
        }}
      />
    </div>
  )
}
