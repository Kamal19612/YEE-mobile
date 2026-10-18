import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutProvider } from '../context/LayoutProvider'
import { useAuth } from '../hooks/useAuth'
import { AppShell } from './AppShell'

/** Écran minimal pendant la restauration de session (pas de chrome app). */
function AuthBootScreen() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bb-body">
      <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
    </div>
  )
}

/**
 * Garde l’app derrière la connexion (parcours type Facebook) :
 * invité → /login ; connecté → shell complet (panel, header, etc.).
 */
export function ProtectedLayout() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) return <AuthBootScreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <LayoutProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </LayoutProvider>
  )
}
