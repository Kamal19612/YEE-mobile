import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { IconClose, IconEye } from '../icons'
import { resourceFileAuthHeaders } from '../../api/resources'
import { lockBodyScroll } from '../../utils/bodyScrollLock'
import { pdfjs } from '../../utils/pdfjs'

/**
 * Densité de rendu pdf.js.
 * - cover : plafond bas sur mobile (aperçu liste, moins de mémoire)
 * - reader : netteté pleine (jusqu’à DPR 3) — le modal charge page par page
 */
function devicePixelRatio(mode = 'reader') {
  if (typeof window === 'undefined') return 1
  const raw = window.devicePixelRatio || 1
  if (mode === 'reader') {
    return Math.min(Math.max(raw, 1), 3)
  }
  const isCoarse = window.matchMedia?.('(pointer: coarse)')?.matches
  const isNarrow = window.matchMedia?.('(max-width: 799px)')?.matches
  const cap = isCoarse || isNarrow ? 2 : 3
  return Math.min(Math.max(raw, 1), cap)
}

async function renderPageToCanvas(page, cssWidth, { mode = 'reader' } = {}) {
  const dpr = devicePixelRatio(mode)
  const base = page.getViewport({ scale: 1 })
  const cssScale = Math.max(cssWidth / base.width, 0.5)
  const viewport = page.getViewport({ scale: cssScale * dpr })
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const cssW = Math.floor(base.width * cssScale)
  const cssH = Math.floor(base.height * cssScale)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

function openDocumentSource({ data, url }) {
  if (url) {
    return pdfjs.getDocument({
      url,
      httpHeaders: resourceFileAuthHeaders(),
      withCredentials: true,
      // Chunks Range — première page sans attendre tout le fichier.
      rangeChunkSize: 65536,
      disableAutoFetch: true,
      disableStream: false,
    })
  }
  return pdfjs.getDocument({ data: data.slice(0) })
}

/**
 * Affiche une couverture (image serveur ou page 1 pdf.js).
 * Le lecteur modal stream via URL quand `fileUrl` est fourni.
 */
export function PdfCoverReader({
  data = null,
  coverSrc = null,
  fileUrl = null,
  title,
  className = '',
}) {
  const { t } = useTranslation()
  const [pageCount, setPageCount] = useState(0)
  const [status, setStatus] = useState(coverSrc ? 'ready' : 'loading')
  const [open, setOpen] = useState(false)
  const coverHostRef = useRef(null)
  const coverButtonRef = useRef(null)

  useEffect(() => {
    if (coverSrc) {
      setStatus('ready')
      setPageCount(0)
      return undefined
    }
    if (!data) {
      setStatus('error')
      return undefined
    }

    let cancelled = false
    setStatus('loading')
    setPageCount(0)

    const run = async () => {
      const host = coverHostRef.current
      if (!host) return
      host.replaceChildren()

      try {
        const loadingTask = openDocumentSource({ data })
        const pdf = await loadingTask.promise
        if (cancelled) {
          await pdf.destroy()
          return
        }
        setPageCount(pdf.numPages)
        const page = await pdf.getPage(1)
        const measured =
          coverButtonRef.current?.clientWidth ||
          host.clientWidth ||
          (typeof window !== 'undefined' ? window.innerWidth - 32 : 720)
        const targetCssWidth = Math.min(Math.max(measured, 280), 860)
        const canvas = await renderPageToCanvas(page, targetCssWidth, { mode: 'cover' })
        const maxH = 'min(28rem, 70dvh)'
        canvas.className =
          'mx-auto block max-h-[min(28rem,70dvh)] w-full bg-white object-contain object-top'
        // Éviter d’étirer au-delà de la largeur de rendu (flou).
        canvas.style.width = '100%'
        canvas.style.maxWidth = `${Math.floor(targetCssWidth)}px`
        canvas.style.height = 'auto'
        canvas.style.maxHeight = maxH
        if (cancelled) {
          await pdf.destroy()
          return
        }
        host.replaceChildren(canvas)
        setStatus('ready')
        await pdf.destroy()
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void run()
    const hostEl = coverHostRef.current
    return () => {
      cancelled = true
      if (hostEl) hostEl.replaceChildren()
    }
  }, [data, coverSrc])

  const canOpen = status === 'ready' && Boolean(data || fileUrl)

  return (
    <>
      <button
        ref={coverButtonRef}
        type="button"
        onClick={() => canOpen && setOpen(true)}
        disabled={!canOpen}
        className={`group relative block w-full overflow-hidden bg-neutral-100 text-left touch-manipulation disabled:cursor-default ${className}`}
        aria-label={t('stories.feed.documentReadAria', { name: title })}
      >
        {status === 'loading' ? (
          <div className="h-56 animate-pulse bg-bb-content/70" aria-hidden />
        ) : null}
        {status === 'error' ? (
          <p className="m-0 px-3 py-6 text-center text-bb-sm text-bb-muted">
            {t('stories.feed.documentPreviewFailed')}
          </p>
        ) : null}
        {coverSrc && status === 'ready' ? (
          <img
            src={coverSrc}
            alt=""
            className="mx-auto block max-h-[min(28rem,70dvh)] w-full bg-white object-contain object-top"
            decoding="async"
          />
        ) : (
          <div
            ref={coverHostRef}
            className={status === 'ready' && !coverSrc ? 'block' : 'hidden'}
            aria-hidden={status !== 'ready'}
          />
        )}
        {status === 'ready' ? (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-10">
            <span className="inline-flex items-center gap-1.5 rounded-bb-btn bg-white/95 px-2.5 py-1.5 text-bb-heading shadow-sm transition group-hover:bg-white">
              <IconEye className="h-4 w-4" aria-hidden />
              {pageCount > 1 ? (
                <span className="text-bb-xs font-medium tabular-nums">{pageCount}</span>
              ) : null}
            </span>
          </span>
        ) : null}
      </button>

      {open ? (
        <PdfReaderModal
          data={data}
          url={fileUrl}
          title={title}
          pageCount={pageCount}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function PdfReaderModal({ data, url, title, pageCount, onClose }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)
  const [error, setError] = useState(false)
  const [readyCount, setReadyCount] = useState(0)
  const [resolvedPages, setResolvedPages] = useState(pageCount || 0)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const unlock = lockBodyScroll()
    return () => {
      window.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    let pdfDoc = null
    const observers = []
    const started = new Set()

    const run = async () => {
      const scroller = scrollRef.current
      if (!scroller || (!data && !url)) return
      scroller.replaceChildren()
      setError(false)
      setReadyCount(0)

      try {
        const loadingTask = openDocumentSource({ data, url })
        pdfDoc = await loadingTask.promise
        if (cancelled) {
          await pdfDoc.destroy()
          return
        }

        const total = pdfDoc.numPages
        setResolvedPages(total)
        const maxWidth = Math.min(scroller.clientWidth || 720, 860)
        const placeholders = []

        for (let i = 1; i <= total; i += 1) {
          const slot = document.createElement('div')
          slot.className =
            'mx-auto mb-3 flex min-h-[12rem] w-full max-w-[860px] items-center justify-center rounded-sm bg-neutral-700/40'
          slot.dataset.page = String(i)
          slot.setAttribute(
            'aria-label',
            t('stories.feed.documentPageLabel', { page: i, total }),
          )
          const label = document.createElement('span')
          label.className = 'text-bb-xs text-white/50'
          label.textContent = `${i} / ${total}`
          slot.appendChild(label)
          scroller.appendChild(slot)
          placeholders.push(slot)
        }

        const renderPage = async (pageNum) => {
          if (cancelled || started.has(pageNum)) return
          started.add(pageNum)
          const slot = placeholders[pageNum - 1]
          if (!slot) return
          try {
            const page = await pdfDoc.getPage(pageNum)
            if (cancelled) return
            const canvas = await renderPageToCanvas(page, maxWidth, { mode: 'reader' })
            if (cancelled) return
            // Pas de max-w-full : largeur CSS = largeur de rendu (pas d’upscale flou).
            canvas.className = 'mx-auto block shadow-sm'
            canvas.setAttribute(
              'aria-label',
              t('stories.feed.documentPageLabel', { page: pageNum, total }),
            )
            slot.replaceChildren(canvas)
            slot.className = 'mx-auto mb-3 block w-full max-w-[860px]'
            setReadyCount((n) => n + 1)
          } catch {
            started.delete(pageNum)
          }
        }

        await renderPage(1)
        if (cancelled) return

        if (typeof IntersectionObserver === 'undefined') {
          for (let i = 2; i <= total; i += 1) {
            if (cancelled) break
            await renderPage(i)
          }
          return
        }

        const root = scroller.parentElement
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              const pageNum = Number(entry.target.dataset.page)
              if (!pageNum) continue
              void renderPage(pageNum)
              if (pageNum > 1) void renderPage(pageNum - 1)
              if (pageNum < total) void renderPage(pageNum + 1)
            }
          },
          { root, rootMargin: '240px 0px', threshold: 0.01 },
        )
        observers.push(io)
        placeholders.forEach((slot) => io.observe(slot))
      } catch {
        if (!cancelled) setError(true)
      }
    }

    void run()

    const scrollerEl = scrollRef.current
    return () => {
      cancelled = true
      observers.forEach((io) => io.disconnect())
      if (scrollerEl) scrollerEl.replaceChildren()
      if (pdfDoc) {
        void pdfDoc.destroy().catch(() => {})
      }
    }
  }, [data, url, t])

  if (typeof document === 'undefined') return null

  const displayCount = resolvedPages || pageCount

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex flex-col bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-reader-title"
    >
      <header
        className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-neutral-900 px-3 pb-2.5 text-white sm:px-4"
        style={{ paddingTop: 'max(0.625rem, var(--bb-safe-top))' }}
      >
        <div className="min-w-0 flex-1">
          <h2 id="pdf-reader-title" className="m-0 truncate text-bb-sm font-semibold sm:text-bb-base">
            {title}
          </h2>
          {displayCount > 0 ? (
            <p className="m-0 text-bb-xs text-white/70">
              {t('stories.feed.documentPageCount', { count: displayCount })}
              {readyCount > 0 && readyCount < displayCount
                ? ` · ${readyCount}/${displayCount}`
                : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-bb-btn text-white touch-manipulation hover:bg-white/10"
          aria-label={t('common.close')}
        >
          <IconClose className="h-5 w-5" />
        </button>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-neutral-800 px-2 py-4 sm:px-4"
        style={{ paddingBottom: 'max(1rem, var(--bb-safe-bottom))' }}
      >
        {error ? (
          <p className="m-0 py-10 text-center text-bb-sm text-white/80">
            {t('stories.feed.documentPreviewFailed')}
          </p>
        ) : null}
        {!error && readyCount === 0 ? (
          <p className="m-0 py-10 text-center text-bb-sm text-white/80">{t('common.loading')}</p>
        ) : null}
        <div ref={scrollRef} />
      </div>
    </div>,
    document.body,
  )
}
