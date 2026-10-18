import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { resetPassword } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { AuthShell } from './AuthShell'

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
      <AuthShell title={t('auth.resetTitle')}>
        <p
          className="mb-6 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700"
          role="alert"
        >
          {t('auth.resetMissingToken')}
        </p>
        <Button as={Link} to="/forgot-password" variant="primary" className="w-full">
          {t('auth.forgotTitle')}
        </Button>
      </AuthShell>
    )
  }

  if (successMessage) {
    return (
      <AuthShell title={t('auth.resetTitle')}>
        <p
          className="mb-6 rounded-bb-inner border border-green-200 bg-green-50 px-3 py-3 text-bb-sm text-green-800"
          role="status"
        >
          {successMessage}
        </p>
        <Button as={Link} to="/login" variant="primary" className="w-full">
          {t('auth.signin')}
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('auth.resetTitle')}
      hint={t('auth.resetHint')}
      footer={
        <p className="m-0">
          <Link to="/login">{t('auth.backToSignin')}</Link>
        </p>
      }
    >
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
          <span className="mb-1.5 block text-bb-sm font-medium text-bb-heading">
            {t('auth.newPassword')}
          </span>
          <PasswordInput
            required
            minLength={10}
            maxLength={256}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="mt-1.5 block text-bb-xs text-bb-muted">{t('auth.passwordHint')}</span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-bb-sm font-medium text-bb-heading">
            {t('auth.confirmPassword')}
          </span>
          <PasswordInput
            required
            minLength={10}
            maxLength={256}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.resetting') : t('auth.resetSubmit')}
        </Button>
      </form>
    </AuthShell>
  )
}
