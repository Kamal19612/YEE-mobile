import { isAxiosError } from 'axios';
import type { ApiError } from '../../types/auth';

/**
 * Extrait un message d'erreur affichable depuis n'importe quelle erreur
 * remontée par une mutation React Query branchée sur apiClient. Centralisé
 * ici pour ne pas dupliquer la logique `error.response?.data?.error` dans
 * chaque formulaire.
 */
export function extractApiErrorMessage(error: unknown, fallback = 'Une erreur est survenue, veuillez réessayer.'): string {
  if (isAxiosError<ApiError>(error) && error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  return fallback;
}
