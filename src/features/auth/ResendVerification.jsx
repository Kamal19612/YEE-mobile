import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resendVerification } from '../../api/auth'
import { Button } from '../../components/ui/Button'

function formatWait(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Demande un nouvel e-mail de confirmation.
 * initialWaitSeconds : délai déjà en cours (juste après l'inscription).
 */
export function ResendVerification({ email, initialWaitSeconds = 0, hint }) {
  const { t } = useTranslation()
  const [secondsLeft, setSecondsLeft] = useState(initialWaitSeconds)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setSecondsLeft(initialWaitSeconds)
  }, [initialWaitSeconds, email])

  useEffect(() => {
    if (secondsLeft <= 0) return undefined
    const id = window.setTimeout(() => setSecondsLeft((n) => Math.max(0, n - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  const onResend = async () => {
    if (!email || secondsLeft > 0 || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const data = await resendVerification(email)
      const wait = Number(data?.retryAfterSeconds)
      setSecondsLeft(Number.isFinite(wait) && wait > 0 ? wait : 120)
      setNotice(data?.message || t('auth.resendVerificationSuccess'))
    } catch (err) {
      setError(err.message || t('auth.resendVerificationFailed'))
    } finally {
      setSending(false)
    }
  }

  const waiting = secondsLeft > 0

  return (
    <div className="mb-4">
      <p className="m-0 mb-3 text-bb-sm text-bb-muted">
        {hint || t('auth.resendVerificationHint')}
      </p>
      {notice && (
        <p
          className="mb-3 rounded-bb-inner border border-green-200 bg-green-50 px-3 py-2 text-bb-sm text-green-800"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          className="mb-3 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={waiting || sending || !email}
        onClick={onResend}
      >
        {sending
          ? t('auth.resendVerificationSending')
          : waiting
            ? t('auth.resendVerificationWait', { time: formatWait(secondsLeft) })
            : t('auth.resendVerification')}
      </Button>
    </div>
  )
}
