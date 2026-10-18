import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CompatibleAudio } from '../../components/ui/CompatibleAudio'
import {
  IconAngleLeft,
  IconAngleRight,
  IconClose,
  IconDownload,
  IconFile,
  IconReply,
  IconTrash,
} from '../../components/icons'

const PdfCoverReader = lazy(() =>
  import('../../components/pdf/PdfCoverReader').then((m) => ({ default: m.PdfCoverReader })),
)
import { fetchPostMediaBlob, isPostMediaPath, isProtectedPostMedia } from '../../api/feed'
import { useAuth } from '../../hooks/useAuth'
import { formatFileSize } from '../../utils/formatFileSize'
import { getCachedPdfFile } from '../../utils/pdfFileCache'
import { lockBodyScroll } from '../../utils/bodyScrollLock'
import { ActivityActions, ActivityState } from './ActivityActions'
import { FeedLikersDialog } from './FeedLikersDialog'
import { formatTimeSince, stripHtml } from './utils'

function commentContainsId(comment, id) {
  return (
    String(comment.id) === String(id) ||
    (comment.replies || []).some((reply) => String(reply.id) === String(id))
  )
}

function postShareUrl(postId) {
  const path = `/feed/${postId}`
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

async function sharePostLink({ url, title, text }) {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // Annulation utilisateur : ne pas basculer en copie.
      if (err?.name === 'AbortError') return 'aborted'
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }
  // Fallback très ancien navigateur
  const input = document.createElement('input')
  input.value = url
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(input)
  if (!ok) throw new Error('copy_failed')
  return 'copied'
}

/**
 * Carte post Feed App API.
 * Auteur : même pattern Avatar + nom que MemberCard (sans bouton follow).
 */
export function FeedPostCard({
  post,
  onLike,
  onDelete,
  onLoadComments,
  onAddComment,
  onDeleteComment,
  initialCommentsOpen = false,
  focusCommentId = null,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const wantedCommentId = focusCommentId ? String(focusCommentId) : null
  const [commentsOpen, setCommentsOpen] = useState(Boolean(initialCommentsOpen || wantedCommentId))
  const [comments, setComments] = useState([])
  const [commentsCursor, setCommentsCursor] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [likersOpen, setLikersOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState(null)
  const didFocusCommentRef = useRef(false)
  const shareFeedbackTimerRef = useRef(0)

  const author = post.author || {}
  const authorName = author.displayName || t('stories.anonymousAuthor')
  const authorLink = author.id ? `/members/${author.id}` : '#'

  useEffect(() => {
    if (!commentsOpen || comments.length > 0 || !onLoadComments) return undefined
    let alive = true
    ;(async () => {
      setCommentsLoading(true)
      setCommentsError(null)
      try {
        let list = []
        let cursor = null
        let pages = 0
        const maxPages = wantedCommentId ? 10 : 1
        do {
          const result = await onLoadComments(post.id, cursor ? { before: cursor } : {})
          if (!alive) return
          list = list.concat(result.comments || [])
          cursor = result.nextCursor
          pages += 1
          const found =
            !wantedCommentId || list.some((c) => commentContainsId(c, wantedCommentId))
          if (found || !cursor) break
        } while (pages < maxPages)
        if (alive) {
          setComments(list)
          setCommentsCursor(cursor)
        }
      } catch (err) {
        if (alive) setCommentsError(err.message || 'Error')
      } finally {
        if (alive) setCommentsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [commentsOpen, comments.length, onLoadComments, post.id, wantedCommentId])

  useEffect(() => {
    if (didFocusCommentRef.current || !wantedCommentId || !commentsOpen) return
    const el = document.getElementById(`acomment-${wantedCommentId}`)
    if (!el) return
    didFocusCommentRef.current = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [wantedCommentId, commentsOpen, comments])

  useEffect(() => {
    return () => {
      if (shareFeedbackTimerRef.current) {
        window.clearTimeout(shareFeedbackTimerRef.current)
      }
    }
  }, [])

  const showShareFeedback = (message) => {
    setShareFeedback(message)
    if (shareFeedbackTimerRef.current) {
      window.clearTimeout(shareFeedbackTimerRef.current)
    }
    shareFeedbackTimerRef.current = window.setTimeout(() => {
      setShareFeedback(null)
      shareFeedbackTimerRef.current = 0
    }, 2200)
  }

  const handleShare = async () => {
    const url = postShareUrl(post.id)
    const plain = stripHtml(post.content || '').trim()
    const text = plain
      ? plain.slice(0, 160)
      : t('stories.postedUpdate')
    try {
      const result = await sharePostLink({
        url,
        title: authorName,
        text,
      })
      if (result === 'copied') {
        showShareFeedback(t('stories.copied'))
      }
    } catch {
      showShareFeedback(t('stories.actions.shareFailed'))
    }
  }

  const handleDelete = async () => {
    if (!onDelete || deleting) return
    setDeleting(true)
    try {
      await onDelete(post.id)
      setConfirmDeleteOpen(false)
    } catch {
      setDeleting(false)
    }
  }

  const handleAddComment = async ({ content, parentId }) => {
    const created = await onAddComment?.(post.id, { content, parentId })
    if (!created) return
    if (parentId) {
      setComments((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(parentId)) return c
          const reply = {
            ...created,
            parentId: String(parentId),
            replyToName: created.replyToName || c.author?.displayName || null,
          }
          return { ...c, replies: [...(c.replies || []), reply] }
        }),
      )
      return
    }
    setComments((prev) => [created, ...prev])
  }

  const handleDeleteComment = async (commentId) => {
    const root = comments.find((c) => String(c.id) === String(commentId))
    const removedCount = root ? 1 + (root.replies?.length || 0) : 1
    await onDeleteComment?.(post.id, commentId, { removedCount })
    setComments((prev) =>
      prev
        .filter((c) => String(c.id) !== String(commentId))
        .map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => String(r.id) !== String(commentId)),
        })),
    )
  }

  const loadMoreComments = async () => {
    if (!commentsCursor || commentsLoading) return
    setCommentsLoading(true)
    setCommentsError(null)
    try {
      const { comments: list, nextCursor } = await onLoadComments(post.id, {
        before: commentsCursor,
      })
      setComments((prev) => [...prev, ...list])
      setCommentsCursor(nextCursor)
    } catch (err) {
      setCommentsError(err.message || 'Error')
    } finally {
      setCommentsLoading(false)
    }
  }

  return (
    <li
      id={`activity-${post.id}`}
      className="activity-item bb-fade-in mb-2 list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content text-[0.875rem] leading-normal shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
    >
      <div className="bp-activity-head flex gap-3 px-4 pb-2 pt-3">
        <div className="activity-avatar item-avatar shrink-0">
          <Link to={authorLink}>
            <Avatar name={authorName} src={author.avatarUrl} size="lg" />
          </Link>
        </div>
        <div className="activity-header min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[0.9375rem] font-semibold leading-snug text-bb-heading">
                <Link to={authorLink} className="hover:text-bb-primary hover:underline">
                  {authorName}
                </Link>
              </div>
              {author.profession ? (
                <div className="truncate text-bb-xs leading-snug text-bb-muted">
                  {author.profession}
                </div>
              ) : null}
              <p className="activity-date m-0 text-bb-xs leading-snug text-bb-muted">
                <span className="time-since">{formatTimeSince(post.createdAt)}</span>
              </p>
            </div>

            {/* isOwnPost : champ serveur — ne pas recalculer via currentUser */}
            {post.isOwnPost ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bb-muted transition hover:bg-bb-alt hover:text-bb-danger disabled:opacity-50"
                disabled={deleting}
                title={t('common.delete')}
                aria-label={t('common.delete')}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <IconTrash className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {post.content ? <FeedPostContent html={post.content} /> : null}

      <FeedPostMedia media={post.media} />

      <div className="px-4 pt-1">
        <ActivityState
          favoriteCount={post.likesCount}
          commentCount={post.commentsCount}
          onOpenLikers={post.likesCount > 0 ? () => setLikersOpen(true) : undefined}
        />
      </div>

      <div className="px-1 sm:px-2">
        <ActivityActions
          favorited={post.viewerHasLiked}
          favoriteCount={post.likesCount}
          commentCount={post.commentsCount}
          commentsOpen={commentsOpen}
          onLike={() => onLike?.(post.id)}
          onToggleComments={() => setCommentsOpen((v) => !v)}
          onShare={handleShare}
        />
      </div>

      {shareFeedback && (
        <p className="m-0 px-4 pb-2 text-center text-bb-xs font-medium text-bb-primary" role="status">
          {shareFeedback}
        </p>
      )}

      {commentsOpen && (
        <div className="activity-comments threaded-comments border-t border-bb-border px-4 pb-3 pt-3">
          <FeedCommentForm onSubmit={handleAddComment} />
          {commentsLoading && comments.length === 0 && (
            <p className="m-0 mt-2 text-bb-sm text-bb-muted">{t('common.loading')}</p>
          )}
          {commentsError && (
            <p className="m-0 mt-2 text-bb-sm text-bb-danger">{commentsError}</p>
          )}
          <ul className="activity-comments-list m-0 mt-3 list-none space-y-3 p-0">
            {comments.map((comment) => {
              const canDeleteComment =
                user?.id != null &&
                comment.author?.id != null &&
                String(comment.author.id) === String(user.id)
              return (
                <FeedCommentItem
                  key={comment.id}
                  comment={comment}
                  focusedId={wantedCommentId}
                  postAuthorId={author.id}
                  onReply={handleAddComment}
                  onDelete={
                    canDeleteComment ? () => handleDeleteComment(comment.id) : undefined
                  }
                  onDeleteReply={handleDeleteComment}
                />
              )
            })}
          </ul>
          {commentsCursor && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                disabled={commentsLoading}
                onClick={loadMoreComments}
              >
                {commentsLoading ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}

      <FeedLikersDialog
        open={likersOpen}
        postId={post.id}
        onClose={() => setLikersOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('stories.feed.deleteConfirmTitle')}
        body={t('stories.feed.deleteConfirmBody')}
        confirmLabel={t('common.delete')}
        confirming={deleting}
        onCancel={() => {
          if (!deleting) setConfirmDeleteOpen(false)
        }}
        onConfirm={handleDelete}
      />
    </li>
  )
}

/** Texte du post — clamp LinkedIn + « voir plus » (HTML déjà sanitisé côté serveur). */
function FeedPostContent({ html }) {
  const { t } = useTranslation()
  const bodyRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [needsClamp, setNeedsClamp] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [html])

  useEffect(() => {
    const el = bodyRef.current
    if (!el || expanded) return undefined

    const measure = () => {
      setNeedsClamp(el.scrollHeight > el.clientHeight + 2)
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [html, expanded])

  return (
    <div className="px-4 pb-1">
      <div
        ref={bodyRef}
        className={clsx(
          'activity-inner break-words text-[0.9375rem] leading-snug text-bb-heading [overflow-wrap:anywhere] [&_*]:break-words [&_*]:[overflow-wrap:anywhere] [&_a]:text-bb-primary [&_p]:m-0 [&_p+p]:mt-2',
          !expanded && 'line-clamp-3',
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {needsClamp || expanded ? (
        <button
          type="button"
          className="-ml-0.5 mt-0.5 px-0.5 text-bb-sm font-semibold text-bb-muted hover:text-bb-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t('stories.feed.seeLess') : t('stories.feed.seeMore')}
        </button>
      ) : null}
    </div>
  )
}

function FeedPostMedia({ media }) {
  const { t } = useTranslation()
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const items = Array.isArray(media) ? media.filter((m) => m?.url) : []
  if (!items.length) return null

  const audios = items.filter((m) => m.type === 'audio')
  const images = items.filter((m) => m.type === 'image')
  const documents = items.filter((m) => m.type === 'document')

  if (audios.length) {
    const audio = audios[0]
    return (
      <div className="bb-activity-media-wrap mx-4 mt-2 mb-1 overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt p-3">
        <ProtectedMedia media={audio} kind="audio" className="w-full" />
      </div>
    )
  }

  if (documents.length) {
    return (
      <div className="bb-activity-media-wrap mx-4 mt-2 mb-1">
        <FeedDocumentCard media={documents[0]} />
      </div>
    )
  }

  if (!images.length) return null

  const count = images.length

  return (
    <>
      <div
        className={`bb-activity-media-wrap mt-2 grid gap-0.5 overflow-hidden ${
          count === 1 ? 'grid-cols-1' : 'grid-cols-2'
        }`}
      >
        {images.map((m, index) => (
          <button
            key={m.id || m.url || index}
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setLightboxIndex(index)
            }}
            className={
              count === 1
                ? 'relative flex max-h-[min(32rem,72dvh)] min-h-[12rem] cursor-zoom-in items-center justify-center overflow-hidden bg-bb-alt p-0 touch-manipulation'
                : 'relative flex aspect-square cursor-zoom-in items-center justify-center overflow-hidden bg-bb-alt p-0'
            }
            aria-label={t('stories.feed.imageLightboxOpen')}
          >
            <ProtectedMedia
              media={m}
              kind="image"
              className={
                count === 1
                  ? 'max-h-[min(32rem,72dvh)] w-full object-contain object-center'
                  : 'max-h-full max-w-full object-contain object-center'
              }
            />
          </button>
        ))}
      </div>

      {lightboxIndex != null ? (
        <FeedImageLightbox
          images={images}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  )
}

function FeedImageLightbox({ images, index, onIndexChange, onClose }) {
  const { t } = useTranslation()
  const total = images.length
  const current = images[index]
  const canPrev = total > 1 && index > 0
  const canNext = total > 1 && index < total - 1
  const [closeReady, setCloseReady] = useState(false)

  useEffect(() => {
    // Évite que le clic d’ouverture traverse le backdrop et referme aussitôt.
    const timer = window.setTimeout(() => setCloseReady(true), 0)
    return () => {
      window.clearTimeout(timer)
      setCloseReady(false)
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowLeft' && canPrev) onIndexChange?.(index - 1)
      if (e.key === 'ArrowRight' && canNext) onIndexChange?.(index + 1)
    }
    window.addEventListener('keydown', onKey)
    const unlock = lockBodyScroll()
    return () => {
      window.removeEventListener('keydown', onKey)
      unlock()
    }
  }, [onClose, onIndexChange, index, canPrev, canNext])

  if (!current || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex flex-col bg-black/85"
      role="dialog"
      aria-modal="true"
      aria-label={t('stories.feed.imageLightboxTitle')}
    >
      <header
        className="relative z-[2] flex shrink-0 items-center gap-3 px-3 pb-2.5 text-white sm:px-4"
        style={{ paddingTop: 'max(0.625rem, var(--bb-safe-top))' }}
      >
        <p className="m-0 min-w-0 flex-1 truncate text-bb-sm text-white/80">
          {total > 1
            ? t('stories.feed.imageLightboxCounter', { current: index + 1, total })
            : t('stories.feed.imageLightboxTitle')}
        </p>
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
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-12"
        style={{ paddingBottom: 'max(1rem, var(--bb-safe-bottom))' }}
      >
        <button
          type="button"
          className="absolute inset-0 cursor-zoom-out"
          aria-label={t('common.close')}
          disabled={!closeReady}
          onClick={() => {
            if (closeReady) onClose?.()
          }}
        />

        {canPrev ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange?.(index - 1)
            }}
            className="absolute left-2 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 sm:left-4"
            aria-label={t('stories.feed.imageLightboxPrev')}
          >
            <IconAngleLeft className="h-5 w-5" />
          </button>
        ) : null}

        {canNext ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange?.(index + 1)
            }}
            className="absolute right-2 z-[2] inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 sm:right-4"
            aria-label={t('stories.feed.imageLightboxNext')}
          >
            <IconAngleRight className="h-5 w-5" />
          </button>
        ) : null}

        <div className="relative z-[2] flex max-h-full max-w-full items-center justify-center p-2">
          <ProtectedMedia
            key={current.id || current.url || index}
            media={current}
            kind="image"
            className="max-h-[min(85dvh,900px)] max-w-[min(96vw,1100px)] object-contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function FeedDocumentCard({ media }) {
  const { t, i18n } = useTranslation()
  const rootRef = useRef(null)
  const [inView, setInView] = useState(false)
  const [pdfData, setPdfData] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const filename = media.filename || t('stories.feed.documentFallbackName')
  const sizeLabel = media.byteSize != null ? formatFileSize(media.byteSize, i18n.language) : ''

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    if (!inView || !media?.url) return undefined
    let cancelled = false
    setPdfData(null)
    setDownloadUrl('')
    setStatus('loading')

    const load = async () => {
      try {
        const entry = await getCachedPdfFile(`feed:${media.url}`, async () => {
          if (isPostMediaPath(media.url)) {
            return fetchPostMediaBlob(media.url)
          }
          const res = await fetch(media.url, { credentials: 'include' })
          if (!res.ok) throw new Error('media')
          return res.blob()
        })
        if (cancelled) return
        setDownloadUrl(entry.objectUrl)
        setPdfData(entry.bytes)
        setStatus('ready')
      } catch {
        if (!cancelled) {
          setPdfData(null)
          setDownloadUrl('')
          setStatus('error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [inView, media.url])

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-bb-inner border border-bb-border bg-bb-alt"
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-bb-inner bg-bb-primary/10 text-bb-primary">
            <IconFile className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-bb-sm font-semibold text-bb-heading">{filename}</p>
            <p className="m-0 text-bb-xs text-bb-muted">
              PDF{sizeLabel ? ` · ${sizeLabel}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status === 'loading' && (
            <span className="text-bb-xs text-bb-muted">{t('common.loading')}</span>
          )}
          {status === 'error' && (
            <span className="text-bb-xs text-bb-danger">{t('stories.feed.documentUnavailable')}</span>
          )}
          {status === 'ready' && downloadUrl ? (
            <a
              href={downloadUrl}
              download={filename}
              title={t('common.download')}
              aria-label={t('common.download')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-bb-btn border border-bb-border bg-bb-content text-bb-heading touch-manipulation hover:bg-bb-alt"
            >
              <IconDownload className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
      {status === 'ready' && pdfData ? (
        <div className="border-t border-bb-border bg-white">
          <Suspense fallback={<div className="h-56 animate-pulse bg-bb-content/70" aria-hidden />}>
            <PdfCoverReader data={pdfData} title={filename} />
          </Suspense>
        </div>
      ) : null}
      {(status === 'loading' || status === 'idle') && (
        <div className="h-40 animate-pulse border-t border-bb-border bg-bb-content/70" aria-hidden />
      )}
      {status === 'error' ? (
        <p className="m-0 border-t border-bb-border px-3 py-4 text-center text-bb-sm text-bb-muted">
          {t('stories.feed.documentPreviewFailed')}
        </p>
      ) : null}
    </div>
  )
}

/** Une balise img ne peut pas envoyer le jeton. Les médias protégés passent par un blob. */
function ProtectedMedia({ media, kind, className }) {
  const [src, setSrc] = useState(isProtectedPostMedia(media.url) ? '' : media.url)
  const [mime, setMime] = useState(guessMediaMime(media))

  useEffect(() => {
    if (!isProtectedPostMedia(media.url)) {
      setSrc(media.url)
      setMime(guessMediaMime(media))
      return undefined
    }
    let objectUrl = ''
    let cancelled = false
    fetchPostMediaBlob(media.url)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setMime(blob.type || guessMediaMime(media))
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setSrc('')
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [media.url, media.type, media.id, media.contentType])

  if (!src) return null
  if (kind === 'audio') {
    return (
      <CompatibleAudio
        src={src}
        mime={mime}
        className={className}
        downloadName={`post-${media.id || 'audio'}`}
      />
    )
  }
  return <img src={src} alt="" className={className} />
}

function guessMediaMime(media) {
  if (media?.contentType) return media.contentType
  const url = String(media?.url || '')
  if (/\.webm(?:$|\?)/i.test(url)) return 'audio/webm'
  if (/\.ogg(?:$|\?)/i.test(url)) return 'audio/ogg'
  if (/\.m4a(?:$|\?)/i.test(url)) return 'audio/mp4'
  if (/\.mp3(?:$|\?)/i.test(url)) return 'audio/mpeg'
  if (/\.wav(?:$|\?)/i.test(url)) return 'audio/wav'
  if (/\.pdf(?:$|\?)/i.test(url) || media?.type === 'document') return 'application/pdf'
  if (media?.type === 'audio') return ''
  return ''
}

function FeedCommentItem({
  comment,
  focusedId = null,
  postAuthorId = null,
  onReply,
  onDelete,
  onDeleteReply,
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [replyOpen, setReplyOpen] = useState(false)
  const author = comment.author || {}
  const authorLink = author.id ? `/members/${author.id}` : null
  const focused = focusedId != null && String(comment.id) === String(focusedId)
  const replies = comment.replies || []

  return (
    <li
      id={`acomment-${comment.id}`}
      aria-current={focused ? 'true' : undefined}
      className="acomment flex scroll-mt-[calc(var(--bb-header-height)+16px)] gap-2.5"
    >
      {authorLink ? (
        <Link to={authorLink} className="shrink-0">
          <Avatar name={author.displayName || '?'} src={author.avatarUrl} size="sm" />
        </Link>
      ) : (
        <Avatar name={author.displayName || '?'} src={author.avatarUrl} size="sm" />
      )}
      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'acomment-content rounded-bb-inner bg-bb-alt px-3 py-2',
            focused && 'acomment-target',
          )}
        >
          <div className="mb-0.5 text-bb-sm font-semibold text-bb-heading">
            {authorLink ? (
              <Link to={authorLink} className="hover:text-bb-primary">
                {author.displayName}
              </Link>
            ) : (
              author.displayName
            )}
          </div>
          {/* Sûr UNIQUEMENT parce que le backend nettoie déjà le HTML via wp_kses (whitelist stricte). */}
          <div
            className="break-words text-bb-sm text-bb-text [&_*]:break-words [&_a]:text-bb-primary [&_p]:m-0"
            dangerouslySetInnerHTML={{ __html: comment.content || '' }}
          />
        </div>
        <div className="acomment-meta mt-1 flex items-center gap-1 pl-1 text-bb-xs text-bb-muted">
          <span className="posted mr-1">{formatTimeSince(comment.createdAt)}</span>
          {onReply ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-bb-inner hover:bg-bb-content hover:text-bb-primary"
              title={t('stories.actions.reply')}
              aria-label={t('stories.actions.reply')}
              onClick={() => setReplyOpen((v) => !v)}
            >
              <IconReply className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-bb-inner text-bb-danger hover:bg-bb-content"
              title={t('common.delete')}
              aria-label={t('common.delete')}
              onClick={onDelete}
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {replyOpen && (
          <div className="mt-2">
            <FeedCommentForm
              compact
              autoFocus
              placeholder={t('stories.actions.replyTo', { name: author.displayName || '' })}
              submitLabel={t('stories.actions.reply')}
              onSubmit={async ({ content }) => {
                await onReply({ content, parentId: comment.id })
                setReplyOpen(false)
              }}
            />
          </div>
        )}
        {replies.length > 0 && (
          <ul className="m-0 mt-2.5 list-none space-y-2 border-l-2 border-[rgba(var(--bb-primary-color-rgb),0.22)] pl-3">
            {replies.map((reply) => {
              const canDeleteReply =
                user?.id != null &&
                reply.author?.id != null &&
                String(reply.author.id) === String(user.id)
              return (
                <FeedReplyItem
                  key={reply.id}
                  reply={reply}
                  replyToName={reply.replyToName || author.displayName}
                  focused={focusedId != null && String(reply.id) === String(focusedId)}
                  isPostAuthor={
                    postAuthorId != null &&
                    reply.author?.id != null &&
                    String(reply.author.id) === String(postAuthorId)
                  }
                  onDelete={canDeleteReply ? () => onDeleteReply?.(reply.id) : undefined}
                />
              )
            })}
          </ul>
        )}
      </div>
    </li>
  )
}

function FeedReplyItem({ reply, replyToName, focused = false, isPostAuthor = false, onDelete }) {
  const { t } = useTranslation()
  const author = reply.author || {}
  const authorLink = author.id ? `/members/${author.id}` : null

  return (
    <li
      id={`acomment-${reply.id}`}
      aria-current={focused ? 'true' : undefined}
      className="acomment-reply scroll-mt-[calc(var(--bb-header-height)+16px)]"
    >
      <div
        className={clsx(
          'rounded-bb-inner border border-dashed border-bb-border bg-bb-content px-2.5 py-2',
          focused && 'acomment-target',
        )}
      >
        <div className="mb-1 flex items-center gap-1.5 text-bb-xs text-bb-muted">
          <span aria-hidden="true">↳</span>
          <span>
            {t('stories.actions.replyToLabel', { name: replyToName || t('notifications.someone') })}
          </span>
        </div>
        <div className="flex gap-2">
          {authorLink ? (
            <Link to={authorLink} className="shrink-0">
              <Avatar name={author.displayName || '?'} src={author.avatarUrl} size="xs" />
            </Link>
          ) : (
            <Avatar name={author.displayName || '?'} src={author.avatarUrl} size="xs" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {authorLink ? (
                <Link to={authorLink} className="text-bb-xs font-semibold text-bb-heading hover:text-bb-primary">
                  {author.displayName}
                </Link>
              ) : (
                <span className="text-bb-xs font-semibold text-bb-heading">{author.displayName}</span>
              )}
              {isPostAuthor ? (
                <span className="rounded-full bg-[rgba(var(--bb-primary-color-rgb),0.1)] px-1.5 py-px text-[0.65rem] font-semibold uppercase tracking-wide text-bb-primary">
                  {t('stories.feed.postAuthorBadge')}
                </span>
              ) : null}
            </div>
            <div
              className="mt-0.5 break-words text-bb-xs leading-snug text-bb-text [&_*]:break-words [&_a]:text-bb-primary [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: reply.content || '' }}
            />
            <div className="mt-1 flex items-center gap-1 text-bb-xs text-bb-muted">
              <span className="mr-1">{formatTimeSince(reply.createdAt)}</span>
              {onDelete ? (
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-bb-inner text-bb-danger hover:bg-bb-alt"
                  title={t('common.delete')}
                  aria-label={t('common.delete')}
                  onClick={onDelete}
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

function FeedCommentForm({ onSubmit, placeholder, autoFocus = false, submitLabel, compact = false }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const currentUser = user || { displayName: 'Guest', avatar: null }

  const submit = async (e) => {
    e.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit({ content: value.trim() })
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ac-reply-content flex items-start gap-2" onSubmit={submit}>
      <Avatar
        name={currentUser.displayName}
        src={currentUser.avatar}
        size={compact ? 'xs' : 'sm'}
        className="shrink-0"
      />
      <div className="ac-textarea flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder || t('stories.feed.commentPlaceholder')}
          className={clsx(
            'ac-input w-full min-w-0 rounded-bb-input border border-bb-border bg-bb-content px-3 outline-none focus:border-bb-primary',
            compact ? 'h-8 text-bb-xs' : 'h-10 text-bb-sm sm:h-9',
          )}
        />
        <Button type="submit" size="sm" className="w-full shrink-0 sm:w-auto" disabled={!value.trim() || busy}>
          {submitLabel || t('common.publish')}
        </Button>
      </div>
    </form>
  )
}
