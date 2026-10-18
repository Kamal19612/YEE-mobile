import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

/**
 * Dialogue de confirmation (portal). N’affecte le flux appelant
 * que via onConfirm / onCancel — aucun autre hook / route.
 */
export function ConfirmDialog({
  open = false,
  title,
  body,
  confirmLabel,
  cancelLabel,
  confirming = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !confirming) onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, confirming, onCancel])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={cancelLabel || t('common.cancel')}
        disabled={confirming}
        onClick={() => {
          if (!confirming) onCancel?.()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
        className="relative z-[1] max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-bb border border-bb-border bg-bb-content p-5 pb-[max(1.25rem,var(--bb-safe-bottom))] shadow-card sm:rounded-bb"
      >
        <h2 id="confirm-dialog-title" className="font-display m-0 text-bb-lg font-semibold text-bb-heading">
          {title}
        </h2>
        {body ? (
          <p id="confirm-dialog-body" className="mt-2 mb-0 text-bb-sm leading-relaxed text-bb-text">
            {body}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={confirming} onClick={onCancel}>
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={confirming}
            onClick={onConfirm}
            className="border-[#b01b22] bg-[var(--bb-danger-color)] text-white shadow-none hover:border-[#8f161c] hover:bg-[#b01b22]"
          >
            {confirming ? t('common.loading') : confirmLabel || t('common.delete')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
