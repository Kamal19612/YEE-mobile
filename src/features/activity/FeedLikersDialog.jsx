import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchPostLikers } from '../../api/feed'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'

/** Liste des personnes qui ont aimé une publication. */
export function FeedLikersDialog({ open, postId, onClose }) {
  const { t } = useTranslation()
  const [likers, setLikers] = useState([])
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !postId) return undefined
    let alive = true
    setLikers([])
    setCursor(null)
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const result = await fetchPostLikers(postId)
        if (!alive) return
        setLikers(result.likers)
        setCursor(result.nextCursor)
      } catch (err) {
        if (alive) setError(err.message || t('stories.feed.likersError'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [open, postId, t])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  const loadMore = async () => {
    if (!cursor || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchPostLikers(postId, { before: cursor })
      setLikers((prev) => [...prev, ...result.likers])
      setCursor(result.nextCursor)
    } catch (err) {
      setError(err.message || t('stories.feed.likersError'))
    } finally {
      setLoading(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-likers-title"
        className="relative z-[1] flex max-h-[min(32rem,calc(100dvh-1rem))] w-full max-w-md flex-col rounded-t-bb border border-bb-border bg-bb-content pb-[var(--bb-safe-bottom)] shadow-card sm:rounded-bb sm:pb-0"
      >
        <header className="flex items-center justify-between gap-3 border-b border-bb-border px-5 py-4">
          <h2 id="feed-likers-title" className="font-display m-0 text-bb-lg font-semibold text-bb-heading">
            {t('stories.feed.likersTitle')}
          </h2>
          <button
            type="button"
            className="text-bb-sm font-medium text-bb-muted hover:text-bb-heading"
            onClick={onClose}
          >
            {t('common.close')}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading && likers.length === 0 && (
            <p className="m-0 py-6 text-center text-bb-sm text-bb-muted">{t('common.loading')}</p>
          )}
          {error && <p className="m-0 py-2 text-bb-sm text-bb-danger">{error}</p>}
          {!loading && !error && likers.length === 0 && (
            <p className="m-0 py-6 text-center text-bb-sm text-bb-muted">{t('stories.feed.likersEmpty')}</p>
          )}
          <ul className="m-0 list-none space-y-1 p-0">
            {likers.map((person) => (
              <li key={person.id}>
                <Link
                  to={`/members/${person.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-bb-inner px-1 py-2 hover:bg-bb-alt"
                >
                  <Avatar name={person.displayName || '?'} src={person.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-bb-heading">{person.displayName}</div>
                    {person.profession ? (
                      <div className="truncate text-bb-xs text-bb-muted">{person.profession}</div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {cursor && (
            <div className="mt-2 flex justify-center pb-1">
              <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={loadMore}>
                {loading ? t('common.loading') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
