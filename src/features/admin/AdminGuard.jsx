import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/** Routes réservées aux administrateurs site (`isSiteAdmin`). */
export function AdminGuard() {
  const { user, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-bb-sm text-bb-muted">
        …
      </div>
    )
  }

  if (!user?.isSiteAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
