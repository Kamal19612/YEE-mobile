import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { register as registerRequest } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { USE_MOCK } from '../../config/api'
import { Button } from '../../components/ui/Button'

/**
 * Inscription App API — POST /app/v1/auth/register
 * Body: { email, password, displayName }
 * Succès 201/202 : message (compte à activer par email) — pas de session.
 */

function formatFieldErrors(details, t) {
  const fields = details?.fields
  if (!fields || typeof fields !== 'object') return null
  const lines = []
  for (const [key, value] of Object.entries(fields)) {
    const label = t(`auth.fields.${key}`, { defaultValue: key })
    if (Array.isArray(value)) {
      value.forEach((msg) => lines.push(`${label} : ${msg}`))
    } else if (value) {
      lines.push(`${label} : ${value}`)
    }
  }
  return lines.length ? lines.join('\n') : null
}

export function RegisterPage() {
  const { t } = useTranslation()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)
    setSubmitting(true)

    try {
      if (USE_MOCK) {
        setSuccessMessage(t('auth.registerSuccessMock'))
        return
      }

      const data = await registerRequest({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      })
      setSuccessMessage(data?.message || t('auth.registerSuccess'))
    } catch (err) {
      const fieldMsg = formatFieldErrors(err.body?.error?.details, t)
      setLocalError(fieldMsg || err.message || t('auth.registerFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
        <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.signup')}</h1>
        <p
          className="mb-6 rounded-bb-inner border border-green-200 bg-green-50 px-3 py-3 text-bb-sm text-green-800"
          role="status"
        >
          {successMessage}
        </p>
        <p className="m-0 mb-4 text-bb-sm text-bb-muted">{t('auth.verifyEmailHint')}</p>
        <Button as={Link} to="/login" variant="primary" className="w-full">
          {t('auth.signin')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
      <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.signup')}</h1>
      <p className="m-0 mb-6 text-bb-sm text-bb-muted">{t('auth.registerHint')}</p>

      {USE_MOCK && (
        <p className="mb-4 rounded-bb-inner border border-bb-border bg-bb-alt px-3 py-2 text-bb-sm text-bb-muted">
          {t('auth.mockMode')}
        </p>
      )}

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
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">
            {t('auth.displayName')}
          </span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={60}
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base outline-none focus:border-bb-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">{t('auth.email')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base outline-none focus:border-bb-primary"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">{t('auth.password')}</span>
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

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.registering') : t('auth.createAccount')}
        </Button>
      </form>

      <p className="mt-6 text-center text-bb-sm text-bb-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="text-bb-primary hover:underline">
          {t('auth.signin')}
        </Link>
      </p>
      <p className="mt-2 text-center text-bb-sm text-bb-muted">
        <Link to="/" className="text-bb-primary hover:underline">
          {t('auth.backHome')}
        </Link>
      </p>
    </div>
  )
}
