import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from './Avatar'
import { dismissLiveToast, subscribeLiveToasts } from '../../lib/liveToasts'

/**
 * Toasts flottants (quelques secondes) pour messages & notifications temps réel.
 */
export function LiveToastHost() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])

  useEffect(() => subscribeLiveToasts(setItems), [])

  if (!items.length) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-dropdown flex flex-col items-end gap-2 p-3 pb-[max(0.75rem,var(--bb-safe-bottom))] bb:bottom-4 bb:right-4 bb:left-auto bb:w-[min(22rem,calc(100vw-1.5rem))] bb:pb-3"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full items-start gap-3 rounded-bb border border-bb-border bg-bb-content p-3 text-left animate-[bb-toast-in_180ms_ease-out]"
          role="status"
        >
          <Avatar
            name={toast.title}
            src={toast.avatarUrl}
            size="sm"
            className="mt-0.5 shrink-0"
          />
          <Link
            to={toast.href}
            onClick={() => dismissLiveToast(toast.id)}
            className="min-w-0 flex-1 no-underline"
          >
            <span className="block text-bb-xs font-semibold uppercase tracking-wide text-bb-muted">
              {toast.kind === 'message'
                ? t('liveToast.messageLabel')
                : t('liveToast.notificationLabel')}
            </span>
            <span className="mt-0.5 block text-bb-sm font-semibold text-bb-heading line-clamp-2">
              {toast.title}
            </span>
            {toast.body ? (
              <span className="mt-0.5 block text-bb-sm text-bb-text line-clamp-2">{toast.body}</span>
            ) : null}
          </Link>
          <button
            type="button"
            className="shrink-0 rounded px-1.5 py-0.5 text-bb-xs text-bb-muted hover:bg-bb-alt hover:text-bb-heading"
            aria-label={t('liveToast.dismiss')}
            onClick={() => dismissLiveToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
