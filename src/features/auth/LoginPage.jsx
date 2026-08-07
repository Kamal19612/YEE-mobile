import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { AuthShell } from './AuthShell'

const passwordInputClass =
  'bb-auth-input h-12 w-full rounded-[10px] border border-bb-border bg-white py-2 pl-3.5 pr-11 text-bb-base text-bb-heading outline-none'

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

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (isAuthenticated) {
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
        <p className="m-0">
          {t('auth.noAccount')}{' '}
          <Link to="/register">{t('auth.signup')}</Link>
        </p>
      }
    >
      {(expired || deactivated || passwordChanged || authError || localError) && (
        <p
          className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5 text-bb-sm text-red-700"
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

      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-bb-sm font-semibold text-bb-heading">
            {t('auth.email')}
          </span>
          <input
            type="email"
            required
            autoComplete="username"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bb-auth-input"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-bb-sm font-semibold text-bb-heading">
            {t('auth.password')}
          </span>
          <PasswordInput
            required
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={passwordInputClass}
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
          <Link
            to="/forgot-password"
            className="shrink-0 text-bb-sm font-semibold text-bb-primary hover:underline"
          >
            {t('auth.forgotLink')}
          </Link>
        </div>

        <button type="submit" className="bb-auth-submit" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('auth.signin')}
          {!submitting ? <span aria-hidden="true">→</span> : null}
        </button>
      </form>
    </AuthShell>
  )
}
