import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { register as registerRequest } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { AuthShell } from './AuthShell'
import { ResendVerification } from './ResendVerification'

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
  const [verificationUrl, setVerificationUrl] = useState(null)
  const [resendWait, setResendWait] = useState(0)
  const [registeredEmail, setRegisteredEmail] = useState('')

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)
    setVerificationUrl(null)
    setSubmitting(true)

    try {
      const data = await registerRequest({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      })
      setSuccessMessage(data?.message || t('auth.registerSuccess'))
      setRegisteredEmail(email.trim())
      const wait = Number(data?.retryAfterSeconds)
      setResendWait(Number.isFinite(wait) && wait > 0 ? wait : 0)
      // Présent seulement si l'API tourne en profil dev (pas de SMTP local).
      if (data?.verificationUrl) {
        setVerificationUrl(data.verificationUrl)
      }
    } catch (err) {
      const fieldMsg = formatFieldErrors(err.body?.error?.details, t)
      setLocalError(fieldMsg || err.message || t('auth.registerFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <AuthShell
        title={t('auth.signup')}
        footer={
          <p className="m-0">
            <Link to="/login">{t('auth.backToSignin')}</Link>
          </p>
        }
      >
        <p
          className="mb-6 rounded-bb-inner border border-green-200 bg-green-50 px-3 py-3 text-bb-sm text-green-800"
          role="status"
        >
          {successMessage}
        </p>
        {verificationUrl ? (
          <div className="mb-6 rounded-bb-inner border border-amber-200 bg-amber-50 px-3 py-3 text-bb-sm text-amber-950">
            <p className="m-0 mb-2 font-medium">{t('auth.devVerifyTitle')}</p>
            <p className="m-0 mb-3 text-bb-xs text-amber-900/80">{t('auth.devVerifyHint')}</p>
            <Button as="a" href={verificationUrl} variant="primary" className="w-full">
              {t('auth.devVerifyCta')}
            </Button>
          </div>
        ) : (
          <p className="m-0 mb-4 text-bb-sm text-bb-muted">{t('auth.verifyEmailHint')}</p>
        )}
        <ResendVerification email={registeredEmail} initialWaitSeconds={resendWait} />
        <Button as={Link} to="/login" variant="primary" className="w-full">
          {t('auth.signin')}
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('auth.signup')}
      hint={t('auth.registerHint')}
      footer={
        <p className="m-0">
          {t('auth.haveAccount')}{' '}
          <Link to="/login">{t('auth.signin')}</Link>
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
            className="bb-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-bb-sm font-medium text-bb-heading">{t('auth.email')}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bb-input"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-bb-sm font-medium text-bb-heading">
            {t('auth.password')}
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

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.registering') : t('auth.createAccount')}
        </Button>
      </form>

      <div className="mt-6 border-t border-bb-border pt-4">
        <ResendVerification email={email.trim()} hint={t('auth.resendVerificationFormHint')} />
      </div>
    </AuthShell>
  )
}
