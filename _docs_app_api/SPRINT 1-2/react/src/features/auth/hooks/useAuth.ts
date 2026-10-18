import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { refreshRequest } from '../api/authApi';

/**
 * À monter UNE SEULE FOIS, au niveau racine de l'app (dans AuthProvider).
 * Tente un refresh silencieux au chargement : si un cookie de refresh
 * httpOnly valide existe encore (l'utilisateur avait coché "remember me" ou
 * revient dans la fenêtre de session courte), la session est restaurée sans
 * repasser par l'écran de login. Sinon, l'utilisateur atterrit simplement
 * non authentifié — comportement attendu, pas une erreur à afficher.
 */
export function useSessionRestore() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setInitializing = useAuthStore((s) => s.setInitializing);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const result = await refreshRequest();
        if (cancelled) return;

        if (result.success) {
          setSession(result.data.user, result.data.accessToken);
        } else {
          clearSession();
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    restore();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Sélecteurs pratiques pour les composants consommateurs. */
export function useAuth() {
  return useAuthStore((s) => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    isInitializing: s.isInitializing,
  }));
}
