import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyProfile,
  fetchPublicProfile,
  updateMyProfile,
} from '../api/profileApi';
import type { UpdateProfilePayload } from '../../../types/profile';

/** Clés de cache centralisées — évite les chaînes dupliquées et les typos. */
export const profileKeys = {
  me: ['profile', 'me'] as const,
  detail: (userId: string) => ['profile', 'detail', userId] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: async () => {
      const result = await fetchMyProfile();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: async () => {
      const result = await fetchPublicProfile(userId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(userId),
    // Un profil change peu souvent comparé à un fil d'actualité : staleTime
    // plus long que ce qu'on mettra sur le feed (cf. stratégie de cache).
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateMyProfile(payload),
    onSuccess: (result) => {
      if (result.success) {
        // Invalidation ciblée (pas de flush global), conformément à la
        // stratégie de cache : seule la clé "profile.me" est concernée.
        queryClient.setQueryData(profileKeys.me, result.data);
      }
    },
  });
}
