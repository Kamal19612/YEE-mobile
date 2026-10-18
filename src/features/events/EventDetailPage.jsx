import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  deleteEvent,
  deleteEventReport,
  deleteEventVisual,
  fetchEventReportBlob,
  uploadEventReport,
  uploadEventVisuals,
} from '../../api/events'
import { IconFile, IconGlobe, IconMapPin } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useEvent } from '../../hooks/useEvents'
import { invalidate, QueryKeys } from '../../lib/queryEvents'
import { LinkifiedText } from '../../utils/linkifyText'
import { EventCover } from './EventCover'
import { EventVisualThumb } from './EventVisualThumb'
import { formatEventRange } from './eventUtils'

export function EventDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { eventId } = useParams()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isSiteAdmin)
  const { event, loading, error } = useEvent(eventId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [reportTitle, setReportTitle] = useState('')
  const [reportFile, setReportFile] = useState(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [visualFiles, setVisualFiles] = useState(null)
  const [visualBusy, setVisualBusy] = useState(false)
  const [attachError, setAttachError] = useState(null)
  const [localEvent, setLocalEvent] = useState(null)

  const display = localEvent || event

  if (loading && !display) {
    return <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
  }

  if ((error || !display) && !localEvent) {
    return (
      <div className="space-y-3">
        <p className="m-0 text-bb-sm text-bb-danger">{t('events.notFound')}</p>
        <Button as={Link} to="/events" size="sm" variant="outline">
          {t('events.back')}
        </Button>
      </div>
    )
  }

  const upcoming = display.temporalStatus === 'upcoming'

  const applyUpdated = (updated) => {
    setLocalEvent(updated)
    invalidate(QueryKeys.events, { reason: 'patch', eventId: updated.id })
  }

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <p className="m-0 mb-3">
        <Link to="/events" className="text-bb-sm text-bb-primary hover:underline">
          {t('events.back')}
        </Link>
      </p>

      <header className="mb-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
              upcoming ? 'bg-[rgba(var(--bb-primary-color-rgb),0.12)] text-bb-primary' : 'bg-bb-alt text-bb-muted'
            }`}
          >
            {upcoming ? t('events.status.upcoming') : t('events.status.past')}
          </span>
          <span className="text-bb-xs font-semibold uppercase tracking-wide text-bb-muted">
            {display.categoryName || display.categorySlug}
          </span>
          <span className="inline-flex items-center gap-1 text-bb-xs text-bb-muted">
            {display.locationType === 'in_person' ? (
              <IconMapPin className="h-3.5 w-3.5" />
            ) : (
              <IconGlobe className="h-3.5 w-3.5" />
            )}
            {display.locationType === 'in_person'
              ? t('events.location.inPerson')
              : t('events.location.online')}
          </span>
        </div>
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{display.title}</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">
          {formatEventRange(display.startsAt, display.endsAt, i18n.language)}
        </p>
        {display.locationType === 'online' && display.joinUrl ? (
          <p className="m-0 mt-2 text-bb-sm">
            <a
              href={display.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bb-primary hover:underline"
            >
              {t('events.joinOnline')}
            </a>
          </p>
        ) : null}
        {display.locationType === 'in_person' && display.venueAddress ? (
          <p className="m-0 mt-2 text-bb-sm text-bb-text">
            <LinkifiedText text={display.venueAddress} />
          </p>
        ) : null}
      </header>

      {deleteError && <p className="mb-3 text-bb-sm text-bb-danger">{deleteError}</p>}

      {(display.coverType === 'photo' || display.coverType === 'video') && (
        <div className="mb-5">
          <EventCover event={display} />
        </div>
      )}

      {display.description ? (
        <section className="bb-card mb-5 p-5">
          <h2 className="m-0 mb-2 text-bb-base font-semibold text-bb-heading">{t('events.about')}</h2>
          <p className="m-0 text-bb-sm leading-relaxed text-bb-text">
            <LinkifiedText text={display.description} />
          </p>
        </section>
      ) : null}

      <section className="bb-card mb-5 p-5">
        <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">{t('events.report.title')}</h2>
        {display.report ? (
          <div className="flex flex-wrap items-center gap-3">
            <IconFile className="h-5 w-5 text-bb-muted" />
            <div className="min-w-0 flex-1">
              <p className="m-0 font-medium text-bb-heading">{display.report.title || display.report.originalFilename}</p>
              <p className="m-0 text-bb-xs text-bb-muted">{display.report.originalFilename}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const blob = await fetchEventReportBlob(display.id)
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = display.report.originalFilename || 'rapport.pdf'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  setAttachError(t('events.report.downloadFailed'))
                }
              }}
            >
              {t('events.report.download')}
            </Button>
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="!border-red-300 !text-red-700"
                disabled={reportBusy}
                onClick={async () => {
                  setReportBusy(true)
                  setAttachError(null)
                  try {
                    applyUpdated(await deleteEventReport(display.id))
                  } catch (err) {
                    setAttachError(err.message || t('events.report.deleteFailed'))
                  } finally {
                    setReportBusy(false)
                  }
                }}
              >
                {t('common.delete')}
              </Button>
            )}
          </div>
        ) : (
          <p className="m-0 text-bb-sm text-bb-muted">{t('events.report.empty')}</p>
        )}

        {isAdmin && !display.report && (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!reportFile) {
                setAttachError(t('events.report.fileRequired'))
                return
              }
              setReportBusy(true)
              setAttachError(null)
              try {
                applyUpdated(
                  await uploadEventReport(display.id, {
                    title: reportTitle.trim(),
                    file: reportFile,
                  }),
                )
                setReportTitle('')
                setReportFile(null)
              } catch (err) {
                setAttachError(err.message || t('events.report.uploadFailed'))
              } finally {
                setReportBusy(false)
              }
            }}
          >
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.report.fields.title')}</span>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                maxLength={200}
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.report.fields.file')}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                className="w-full text-bb-sm"
              />
              <span className="mt-1 block text-bb-xs text-bb-muted">{t('events.report.pdfHint')}</span>
            </label>
            <Button type="submit" size="sm" disabled={reportBusy || !reportFile}>
              {reportBusy ? t('common.publishing') : t('events.report.attach')}
            </Button>
          </form>
        )}
      </section>

      <section className="bb-card mb-5 p-5">
        <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">{t('events.visuals.title')}</h2>
        {display.visuals?.length ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
            {display.visuals.map((visual) => (
              <li key={visual.id} className="relative overflow-hidden rounded-bb-inner border border-bb-border">
                <EventVisualThumb eventId={display.id} visual={visual} className="aspect-square w-full" />
                {isAdmin && (
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white"
                    disabled={visualBusy}
                    onClick={async () => {
                      setVisualBusy(true)
                      setAttachError(null)
                      try {
                        applyUpdated(await deleteEventVisual(display.id, visual.id))
                      } catch (err) {
                        setAttachError(err.message || t('events.visuals.deleteFailed'))
                      } finally {
                        setVisualBusy(false)
                      }
                    }}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-bb-sm text-bb-muted">{t('events.visuals.empty')}</p>
        )}

        {isAdmin && (
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault()
              const files = visualFiles ? Array.from(visualFiles) : []
              if (!files.length) {
                setAttachError(t('events.visuals.fileRequired'))
                return
              }
              setVisualBusy(true)
              setAttachError(null)
              try {
                applyUpdated(await uploadEventVisuals(display.id, files))
                setVisualFiles(null)
                e.target.reset?.()
              } catch (err) {
                setAttachError(err.message || t('events.visuals.uploadFailed'))
              } finally {
                setVisualBusy(false)
              }
            }}
          >
            <label className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.visuals.fields.files')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setVisualFiles(e.target.files)}
                className="w-full text-bb-sm"
              />
              <span className="mt-1 block text-bb-xs text-bb-muted">{t('events.visuals.hint')}</span>
            </label>
            <Button type="submit" size="sm" disabled={visualBusy || !visualFiles?.length}>
              {visualBusy ? t('common.publishing') : t('events.visuals.attach')}
            </Button>
          </form>
        )}
      </section>

      {attachError && <p className="mb-4 text-bb-sm text-bb-danger">{attachError}</p>}

      {isAdmin && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="!border-red-300 !text-red-700"
          onClick={() => {
            setDeleteError(null)
            setConfirmDelete(true)
          }}
        >
          {t('events.delete')}
        </Button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('events.deleteConfirmTitle')}
        body={t('events.deleteConfirmBody', { title: display.title })}
        confirmLabel={t('events.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setDeleting(true)
          setDeleteError(null)
          try {
            await deleteEvent(display.id)
            invalidate(QueryKeys.events, { reason: 'delete', eventId: display.id })
            navigate('/events')
          } catch (err) {
            setDeleteError(err.message || t('events.deleteFailed'))
            setConfirmDelete(false)
          } finally {
            setDeleting(false)
          }
        }}
        confirming={deleting}
      />
    </div>
  )
}
