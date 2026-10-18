import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconDownload, IconFile } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { fetchResourceCoverBlob, fetchResourceFileBlob } from '../../api/resources'
import { getCachedPdfFile } from '../../utils/pdfFileCache'
import { formatFileSize } from '../../utils/formatFileSize'

const PdfCoverReader = lazy(() =>
  import('../../components/pdf/PdfCoverReader').then((m) => ({ default: m.PdfCoverReader })),
)

/**
 * Carte document — couverture serveur (JPEG) si dispo, sinon fallback pdf.js.
 * Le lecteur stream le PDF via Range quand `fileUrl` est utilisé.
 */
export function ResourceDocumentCard({
  resource,
  meta = '',
  showOpen = false,
  showDelete = false,
  deleting = false,
  onDelete,
  /** true = charge immédiatement (fiche détail) */
  eagerPreview = false,
}) {
  const { t, i18n } = useTranslation()
  const rootRef = useRef(null)
  const [inView, setInView] = useState(Boolean(eagerPreview))
  const [pdfData, setPdfData] = useState(null)
  const [coverSrc, setCoverSrc] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [status, setStatus] = useState(eagerPreview ? 'loading' : 'idle')
  const filename = resource.originalFilename || `${resource.title}.pdf`
  const sizeLabel =
    resource.byteSize != null && Number.isFinite(resource.byteSize)
      ? formatFileSize(resource.byteSize, i18n.language)
      : ''

  useEffect(() => {
    if (eagerPreview) {
      setInView(true)
      return undefined
    }
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '80px 0px', threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [eagerPreview])

  useEffect(() => {
    if (!inView || !resource?.id) return undefined
    let cancelled = false
    setPdfData(null)
    setCoverSrc('')
    setDownloadUrl('')
    setStatus('loading')

    const load = async () => {
      try {
        // Toujours tenter la miniature serveur (génération lazy côté API si absente).
        try {
          const cover = await fetchResourceCoverBlob(resource.id)
          if (cancelled) return
          setCoverSrc(cover.objectUrl)
          setStatus('ready')
          return
        } catch {
          /* fallback pdf.js ci-dessous */
        }

        const entry = await getCachedPdfFile(`resource:${resource.id}`, () =>
          fetchResourceFileBlob(resource.id),
        )
        if (cancelled) return
        setDownloadUrl(entry.objectUrl)
        setPdfData(entry.bytes)
        setStatus('ready')
      } catch {
        if (!cancelled) {
          setPdfData(null)
          setCoverSrc('')
          setDownloadUrl('')
          setStatus('error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
      // objectUrl géré par le cache partagé
    }
  }, [inView, resource?.id])

  const onDownload = async (e) => {
    e.preventDefault()
    try {
      if (downloadUrl) {
        triggerDownload(downloadUrl, filename)
        return
      }
      const entry = await getCachedPdfFile(`resource:${resource.id}`, () =>
        fetchResourceFileBlob(resource.id),
      )
      setDownloadUrl(entry.objectUrl)
      setPdfData(entry.bytes)
      triggerDownload(entry.objectUrl, filename)
    } catch {
      /* ignore — statut erreur déjà géré ailleurs si besoin */
    }
  }

  return (
    <article
      ref={rootRef}
      className={`overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt ${deleting ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-bb-inner bg-bb-primary/10 text-bb-primary">
            <IconFile className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-bb-sm font-semibold text-bb-heading">{resource.title}</p>
            <p className="m-0 truncate text-bb-xs text-bb-muted">
              PDF{sizeLabel ? ` · ${sizeLabel}` : ''}
              {meta ? ` · ${meta}` : ''}
              {filename && filename !== resource.title ? ` · ${filename}` : ''}
            </p>
            {resource.description ? (
              <p className="m-0 mt-1 line-clamp-2 text-bb-xs text-bb-text">{resource.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {status === 'loading' && (
            <span className="text-bb-xs text-bb-muted">{t('common.loading')}</span>
          )}
          {status === 'error' && (
            <span className="text-bb-xs text-bb-danger">{t('resources.fileUnavailable')}</span>
          )}
          {status === 'ready' ? (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-bb-btn border border-bb-border bg-bb-content px-3 text-bb-sm font-medium text-bb-heading touch-manipulation hover:bg-bb-alt sm:w-auto"
            >
              <IconDownload className="h-4 w-4" />
              {t('common.download')}
            </button>
          ) : null}
          {showOpen ? (
            <Button
              as={Link}
              to={`/resources/${resource.id}`}
              size="sm"
              variant="outline"
              className="min-h-10 w-full touch-manipulation sm:w-auto"
            >
              {t('resources.open')}
            </Button>
          ) : null}
          {showDelete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={deleting}
              onClick={onDelete}
              className="min-h-10 w-full touch-manipulation sm:w-auto"
            >
              {t('resources.delete')}
            </Button>
          ) : null}
        </div>
      </div>

      {status === 'ready' && (coverSrc || pdfData) ? (
        <div className="border-t border-bb-border bg-white">
          <Suspense fallback={<div className="h-56 animate-pulse bg-bb-content/70" aria-hidden />}>
            <PdfCoverReader
              data={pdfData}
              coverSrc={coverSrc || null}
              fileUrl={resource.fileUrl || `/api/resources/${resource.id}/file`}
              title={resource.title || filename}
            />
          </Suspense>
        </div>
      ) : null}

      {(status === 'loading' || status === 'idle') && (
        <div className="h-40 animate-pulse border-t border-bb-border bg-bb-content/70" aria-hidden />
      )}

      {status === 'error' ? (
        <p className="m-0 border-t border-bb-border px-3 py-4 text-center text-bb-sm text-bb-muted">
          {t('resources.previewFailed')}
        </p>
      ) : null}
    </article>
  )
}

function triggerDownload(url, name) {
  const a = document.createElement('a')
  a.href = url
  a.download = name || 'document.pdf'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}
