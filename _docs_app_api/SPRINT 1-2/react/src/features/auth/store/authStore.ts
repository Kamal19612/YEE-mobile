import { create } from 'zustand';
import type { AuthUser } from '../../../types/auth';

/**
 * L'access token vit UNIQUEMENT en mémoire (state Zustand), jamais en
 * localStorage/sessionStorage : ces deux storages sont lisibles par
 * n'importe quel script exécuté sur la page (XSS), alors que la mémoire JS
 * d'un store React ne l'est pas de la même façon persistante/exportable.
 *
 * Conséquence acceptée et voulue : un refresh de page (F5) perd l'access
 * token en mémoire. C'est pour ça que /auth/refresh existe : au démarrage de
 * l'app, on tente un refresh silencieux via le cookie httpOnly (que le JS ne
 * peut pas lire mais que le navigateur envoie automatiquement), pour
 * restaurer la session sans redemander les identifiants. Voir useAuth.ts.
 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** true tant que la tentative de restauration de session au démarrage n'est pas terminée. */
  isInitializing: boolean;

  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setSession: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  clearSession: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),

  setInitializing: (value) => set({ isInitializing: value }),
}));

/**
 * Accès à l'access token courant HORS composant React (ex. dans un
 * intercepteur Axios, qui n'est pas un hook). Zustand permet de lire l'état
 * en dehors du cycle de rendu via getState().
 */
export const getCurrentAccessToken = (): string | null =>
  useAuthStore.getState().accessToken;
