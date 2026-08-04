import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authApi from '../api/auth'
import { clearToken, getToken, setUnauthorizedHandler } from '../api/client'
import { USE_MOCK } from '../config/api'
import { currentUser as demoUser } from '../data/demoData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [authError, setAuthError] = useState(null)

  const logout = useCallback(
    ({ redirect = true } = {}) => {
      authApi.logout()
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
      if (USE_MOCK) {
        if (alive) {
          setUser(demoUser)
          setBootstrapping(false)
        }
        return
      }

      if (!getToken()) {
        if (alive) {
          setUser(null)
          setBootstrapping(false)
        }
        return
      }

      try {
        const me = await authApi.getCurrentUser()
        if (alive) setUser(me)
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

  const login = useCallback(async (email, password) => {
    setAuthError(null)
    if (USE_MOCK) {
      setUser(demoUser)
      return demoUser
    }
    try {
      await authApi.login(email, password)
      const me = await authApi.getCurrentUser()
      setUser(me)
      return me
    } catch (err) {
      setAuthError(err.message || 'Échec de connexion')
      throw err
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping: bootstrapping,
      authError,
      login,
      logout,
      /** En mock : utilisateur démo. En live : user WP ou null. */
      currentUser: user,
    }),
    [user, bootstrapping, authError, login, logout],
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
