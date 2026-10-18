import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { verifyEmail } from '../../api/auth'
import { Button } from '../../components/ui/Button'
import { AuthShell } from './AuthShell'

/**
 * Vérification email App API — POST /app/v1/auth/verify-email
 * Lien email : {APP_FRONTEND_URL}/verify-email?token=…
 */

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState(() => (token ? 'loading' : 'missing'))
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!token) return

    let alive = true
    async function run() {
      try {
        const data = await verifyEmail(token)
        if (!alive) return
        setStatus('ok')
        setMessage(data?.message || t('auth.verifySuccess'))
      } catch (err) {
        if (!alive) return
        setStatus('error')
        setMessage(err.message || t('auth.verifyFailed'))
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [token, t])

  return (
    <AuthShell title={t('auth.verifyTitle')}>
      {status === 'loading' && (
        <p className="m-0 text-bb-sm text-bb-muted">{t('auth.verifying')}</p>
      )}

      {status === 'missing' && (
        <p
          className="mb-6 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700"
          role="alert"
        >
          {t('auth.verifyMissingToken')}
        </p>
      )}

      {status === 'ok' && (
        <p
          className="mb-6 rounded-bb-inner border border-green-200 bg-green-50 px-3 py-3 text-bb-sm text-green-800"
          role="status"
        >
          {message}
        </p>
      )}

      {status === 'error' && (
        <p
          className="mb-6 rounded-bb-inner border border-red-200 bg-red-50 px-3 py-2 text-bb-sm text-red-700"
          role="alert"
        >
          {message}
        </p>
      )}

      {(status === 'ok' || status === 'error' || status === 'missing') && (
        <Button as={Link} to="/login" variant="primary" className="w-full">
          {t('auth.signin')}
        </Button>
      )}
    </AuthShell>
  )
}
