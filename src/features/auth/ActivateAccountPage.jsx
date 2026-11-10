import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { activateAccount } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { AuthShell } from './AuthShell'

/**
 * Activation post-vérif admin — POST /auth/activate-account
 * Body: { token, newPassword }
 * Lien email : {APP_FRONTEND_URL}/activate-account?token=…
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

export function ActivateAccountPage() {
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
      const data = await activateAccount(token, password)
      setSuccessMessage(data?.message || t('auth.activateSuccess'))
    } catch (err) {
      const fieldMsg = formatPasswordErrors(err.body?.error?.details, t)
      setLocalError(fieldMsg || err.message || t('auth.activateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthShell title={t('auth.activateTitle')}>
        <p
          className="mb-6 rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger"
          role="alert"
        >
          {t('auth.activateMissingToken')}
        </p>
        <Button as={Link} to="/login" variant="primary" className="w-full">
          {t('auth.signin')}
        </Button>
      </AuthShell>
    )
  }

  if (successMessage) {
    return (
      <AuthShell title={t('auth.activateTitle')}>
        <p
          className="mb-6 rounded-bb-input bg-afr-success-tint px-4 py-3 text-bb-sm font-medium text-afr-success"
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
      title={t('auth.activateTitle')}
      hint={t('auth.activateHint')}
      footer={
        <p className="m-0">
          <Link to="/login">{t('auth.backToSignin')}</Link>
        </p>
      }
    >
      {localError && (
        <p
          className="mb-4 whitespace-pre-line rounded-bb-input bg-afr-danger-tint px-4 py-3 text-bb-sm font-medium text-afr-danger"
          role="alert"
        >
          {localError}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <label className="block">
          <span className="mb-2 block text-bb-sm font-semibold text-bb-heading">
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
          <span className="mt-2 block text-bb-xs text-bb-muted">{t('auth.passwordHint')}</span>
        </label>

        <label className="block">
          <span className="mb-2 block text-bb-sm font-semibold text-bb-heading">
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

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
          {submitting ? t('auth.activating') : t('auth.activateSubmit')}
        </Button>
      </form>
    </AuthShell>
  )
}
