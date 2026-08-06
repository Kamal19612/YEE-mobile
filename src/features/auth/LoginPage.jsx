import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { AuthShell } from './AuthShell'

export function LoginPage() {
  const { t } = useTranslation()
  const { login, isAuthenticated, isBootstrapping, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)

  const from = location.state?.from?.pathname || '/'
  const expired = location.state?.reason === 'session_expired'
  const deactivated = location.state?.reason === 'account_deactivated'
  const passwordChanged = location.state?.reason === 'password_changed'

  if (!isBootstrapping && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password, { rememberMe })
      navigate(from, { replace: true })
    } catch (err) {
      const code = err.code || err.body?.error?.code
      if (code === 'email_not_verified') {
        setLocalError(err.message || t('auth.emailNotVerified'))
      } else {
        setLocalError(err.message || t('auth.loginFailed'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.signin')}
      hint={t('auth.loginHint')}
      footer={
        <>
          <p className="m-0 text-center text-bb-sm text-bb-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-bb-primary hover:underline">
              {t('auth.signup')}
            </Link>
          </p>
          <p className="mt-2 text-center text-bb-sm text-bb-muted">
            <Link to="/" className="text-bb-primary hover:underline">
              {t('auth.backHome')}
            </Link>
          </p>
        </>
      }
    >
      {(expired || deactivated || passwordChanged || authError || localError) && (
        <p
          className="mb-4 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700"
          role="alert"
        >
          {localError ||
            authError ||
            (deactivated
              ? t('auth.accountDeactivated')
              : passwordChanged
                ? t('auth.passwordChangedRelogin')
                : t('auth.sessionExpired'))}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-bb-sm font-medium text-bb-heading">{t('auth.email')}</span>
          <input
            type="email"
            required
            autoComplete="username"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-bb-sm text-bb-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-bb-border text-bb-primary"
            />
            {t('auth.rememberMe')}
          </label>
          <Link to="/forgot-password" className="shrink-0 text-bb-sm font-medium text-bb-primary hover:underline">
            {t('auth.forgotLink')}
          </Link>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('auth.signin')}
        </Button>
      </form>
    </AuthShell>
  )
}
