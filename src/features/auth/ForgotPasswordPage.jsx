import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forgotPassword } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'

/**
 * Mot de passe oublié — POST /app/v1/auth/forgot-password
 * Body: { email }
 * Réponse toujours générique (anti-énumération), même si l’email n’existe pas.
 */

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [email, setEmail] = useState('')
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
      const data = await forgotPassword(email.trim())
      setSuccessMessage(data?.message || t('auth.forgotSuccess'))
    } catch (err) {
      setLocalError(err.message || t('auth.forgotFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
        <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.forgotTitle')}</h1>
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
      <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.forgotTitle')}</h1>
      <p className="m-0 mb-6 text-bb-sm text-bb-muted">{t('auth.forgotHint')}</p>

      {localError && (
        <p className="mb-4 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700" role="alert">
          {localError}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
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
        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.forgotSending') : t('auth.forgotSubmit')}
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
