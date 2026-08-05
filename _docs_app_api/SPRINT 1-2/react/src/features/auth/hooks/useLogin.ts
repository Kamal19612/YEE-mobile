import { useMutation } from '@tanstack/react-query';
import { loginRequest } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import type { LoginPayload } from '../../../types/auth';

/**
 * Encapsule la mutation de login + la mise à jour du store en cas de succès.
 * Le composant appelant (LoginForm) n'a besoin de connaître ni l'API ni le
 * store : il consomme juste { mutate, isPending, error }.
 *
 * Note : côté backend, une erreur métier (identifiants invalides, email non
 * vérifié...) est renvoyée avec un code HTTP non-2xx (401, 403...). Axios
 * transforme donc systématiquement ces cas en promesse rejetée : ils
 * remontent dans `error` (AxiosError), pas dans un `result.success === false`
 * côté `onSuccess`. Le composant lit `error.response?.data?.error` pour
 * afficher le message métier — voir LoginForm.tsx.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginRequest(payload),
    onSuccess: (result) => {
      if (result.success) {
        setSession(result.data.user, result.data.accessToken);
      }
    },
  });
}
