import { useMutation } from '@tanstack/react-query';
import { registerRequest } from '../api/authApi';
import type { RegisterPayload } from '../../../types/auth';

/**
 * L'inscription ne connecte pas automatiquement l'utilisateur (le compte
 * n'est actif qu'après vérification de l'email, cf. AuthController::register
 * côté backend) — pas de setSession() ici, juste la mutation brute.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerRequest(payload),
  });
}
