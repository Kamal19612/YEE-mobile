import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followUser, unfollowUser } from '../api/profileApi';
import { profileKeys } from './useProfile';
import type { PublicProfile } from '../../../types/profile';

/**
 * Mise à jour OPTIMISTE : le bouton "Suivre" doit réagir instantanément au
 * clic (attendre l'aller-retour réseau donnerait une impression de
 * lenteur sur une action aussi fréquente). En cas d'échec réseau, on
 * restaure l'état précédent (rollback) — cf. onError.
 */
export function useFollowToggle(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nextFollowing: boolean) =>
      nextFollowing ? followUser(userId) : unfollowUser(userId),

    onMutate: async (nextFollowing: boolean) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(userId) });

      const previous = queryClient.getQueryData<PublicProfile>(profileKeys.detail(userId));

      if (previous) {
        queryClient.setQueryData<PublicProfile>(profileKeys.detail(userId), {
          ...previous,
          stats: {
            ...previous.stats,
            followersCount: previous.stats.followersCount + (nextFollowing ? 1 : -1),
          },
        });
      }

      return { previous };
    },

    onError: (_error, _nextFollowing, context) => {
      if (context?.previous) {
        queryClient.setQueryData(profileKeys.detail(userId), context.previous);
      }
    },

    // Toujours re-synchroniser avec le serveur après coup (succès ou échec)
    // pour rattraper un compteur qui aurait dérivé (ex. deux onglets ouverts).
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
    },
  });
}
