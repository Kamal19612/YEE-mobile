import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'
import { clearToken, setUnauthorizedHandler } from '../api/client'
import { enrichSessionUser } from '../api/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [authError, setAuthError] = useState(null)

  const logout = useCallback(
    async ({ redirect = true } = {}) => {
      await authApi.logout()
      setUser(null)
      setAuthError(null)
      if (redirect) navigate('/login', { replace: true })
    },
    [navigate],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      navigate('/login', { replace: true, state: { reason: 'session_expired' } })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  useEffect(() => {
    let alive = true
    async function bootstrap() {
      // Access token mémoire perdu au F5 → restauration via cookie refresh httpOnly
      try {
        const session = await authApi.restoreSession()
        if (!alive) return
        if (!session?.user) {
          setUser(null)
          return
        }
        const enriched = await enrichSessionUser(session.user)
        if (alive) setUser(enriched)
      } catch {
        clearToken()
        if (alive) setUser(null)
      } finally {
        if (alive) setBootstrapping(false)
      }
    }
    bootstrap()
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email, password, { rememberMe = true } = {}) => {
    setAuthError(null)
    try {
      const { user: me } = await authApi.login(email, password, { rememberMe })
      if (!me) {
        clearToken()
        const err = new Error('Impossible de récupérer le profil utilisateur')
        setAuthError(err.message)
        throw err
      }
      const enriched = await enrichSessionUser(me)
      setUser(enriched)
      return enriched
    } catch (err) {
      clearToken()
      setUser(null)
      setAuthError(err.message || 'Échec de connexion')
      throw err
    }
  }, [])

  const patchUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping: bootstrapping,
      authError,
      login,
      logout,
      patchUser,
      currentUser: user,
    }),
    [user, bootstrapping, authError, login, logout, patchUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
