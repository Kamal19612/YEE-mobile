import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, ENDPOINTS } from './endpoints';
import { getCurrentAccessToken, useAuthStore } from '../../features/auth/store/authStore';

/**
 * Client Axios central. `withCredentials: true` est indispensable : c'est ce
 * qui fait que le navigateur envoie automatiquement le cookie httpOnly
 * "app_refresh_token" sur les requêtes vers le backend (notamment
 * /auth/refresh), sans que le JS n'ait jamais besoin d'y accéder.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
});

// Ajoute l'access token courant sur chaque requête sortante.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getCurrentAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Gestion du refresh automatique en cas de 401 (access token expiré).
 *
 * Problème classique à éviter : si 5 requêtes échouent en 401 en même temps
 * (ex. plusieurs appels React Query en parallèle au chargement d'une page),
 * il ne faut PAS déclencher 5 appels /auth/refresh concurrents (ça
 * grillerait le refresh token dès le 2e appel, à cause de la rotation
 * côté serveur). D'où le mécanisme de file d'attente ci-dessous : une seule
 * requête de refresh "en vol" à la fois, les autres attendent son résultat.
 */
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isAuthEndpoint =
      originalRequest?.url?.includes(ENDPOINTS.auth.login) ||
      originalRequest?.url?.includes(ENDPOINTS.auth.refresh);

    if (error.response?.status !== 401 || isAuthEndpoint || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // Une requête de refresh est déjà en cours : on attend son résultat
      // plutôt que d'en déclencher une nouvelle.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await apiClient.post(ENDPOINTS.auth.refresh);
      const newAccessToken = data.data.accessToken as string;

      useAuthStore.getState().setSession(data.data.user, newAccessToken);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Le refresh a échoué (session vraiment expirée/révoquée) : on
      // déconnecte proprement côté frontend.
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
