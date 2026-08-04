import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { USE_MOCK } from '../../config/api'
import { Button } from '../../components/ui/Button'

export function LoginPage() {
  const { t } = useTranslation()
  const { login, isAuthenticated, isBootstrapping, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)

  const from = location.state?.from?.pathname || '/'
  const expired = location.state?.reason === 'session_expired'

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setLocalError(err.message || t('auth.loginFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center py-10">
      <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">{t('auth.signin')}</h1>
      <p className="m-0 mb-6 text-bb-sm text-bb-muted">{t('auth.loginHint')}</p>

      {USE_MOCK && (
        <p className="mb-4 rounded-bb-inner border border-bb-border bg-bb-alt px-3 py-2 text-bb-sm text-bb-muted">
          {t('auth.mockMode')}
        </p>
      )}

      {(expired || authError || localError) && (
        <p className="mb-4 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700" role="alert">
          {localError || authError || t('auth.sessionExpired')}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-bb-sm font-medium text-bb-heading">{t('auth.email')}</span>
          <input
            type="email"
            required
            autoComplete="username"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-base outline-none focus:border-bb-primary"
          />
        </label>
        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('auth.signin')}
        </Button>
      </form>

      <p className="mt-6 text-center text-bb-sm text-bb-muted">
        <Link to="/" className="text-bb-primary hover:underline">
          {t('auth.backHome')}
        </Link>
      </p>
    </div>
  )
}
