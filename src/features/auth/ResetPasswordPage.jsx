import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resetPassword } from '../../api/auth'
import { USE_MOCK } from '../../config/api'
import { Button } from '../../components/ui/Button'

/**
 * Réinitialisation — POST /app/v1/auth/reset-password
 * Body: { token, newPassword }
 * Lien email : {APP_FRONTEND_URL}/reset-password?token=…
 */

function formatPasswordErrors(details, t) {
  const fields = details?.fields
  if (!fields || typeof fields !== 'object') return null
  const value = fields.newPassword
  if (Array.isArray(value)) return value.join('\n')
  if (value) return String(value)
  const lines = []
  for (const [key, v] of Object.entries(fields)) {
    const label = t(`auth.fields.${key}`, { defaultValue: key })
    if (Array.isArray(v)) v.forEach((msg) => lines.push(`${label} : ${msg}`))
    else if (v) lines.push(`${label} : ${v}`)
  }
  return lines.length ? lines.join('\n') : null
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)

    if (password !== confirm) {
      setLocalError(t('auth.passwordMismatch'))
      return
    }

    setSubmitting(true)
    try {
      if (USE_MOCK) {
        setSuccessMessage(t('auth.resetSuccess'))
        return
      }
      const data = await resetPassword(token, password)
      setSuccessMessage(data?.message || t('auth.resetSuccess'))
    } catch (err) {
      const fieldMsg = formatPasswordErrors(err.body?.error?.details, t)
      setLocalError(fieldMsg || err.message || t('auth.resetFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
        <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.resetTitle')}</h1>
        <p className="mb-6 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700" role="alert">
          {t('auth.resetMissingToken')}
        </p>
        <Button as={Link} to="/forgot-password" variant="primary" className="w-full">
          {t('auth.forgotTitle')}
        </Button>
      </div>
    )
  }

  if (successMessage) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
        <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.resetTitle')}</h1>
        <p
          className="mb-6 rounded-bb-inner border border-green-200 bg-green-50 px-3 py-3 text-bb-sm text-green-800"
          role="status"
        >
          {successMessage}
        </p>
        <Button as={Link} to="/login" variant="primary" className="w-full">
          {t('auth.signin')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
      <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.resetTitle')}</h1>
      <p className="m-0 mb-6 text-bb-sm text-bb-muted">{t('auth.resetHint')}</p>

      {localError && (
        <p
          className="mb-4 whitespace-pre-line rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700"
          role="alert"
        >
          {localError}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">{t('auth.newPassword')}</span>
          <input
            type="password"
            required
            minLength={10}
            maxLength={256}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base outline-none focus:border-bb-primary"
          />
          <span className="mt-1 block text-bb-xs text-bb-muted">{t('auth.passwordHint')}</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">{t('auth.confirmPassword')}</span>
          <input
            type="password"
            required
            minLength={10}
            maxLength={256}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base outline-none focus:border-bb-primary"
          />
        </label>

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.resetting') : t('auth.resetSubmit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-bb-sm text-bb-muted">
        <Link to="/login" className="text-bb-primary hover:underline">
          {t('auth.backToSignin')}
        </Link>
      </p>
    </div>
  )
}
