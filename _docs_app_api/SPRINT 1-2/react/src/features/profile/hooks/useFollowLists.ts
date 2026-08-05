import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchFollowers, fetchFollowing } from '../api/profileApi';

/**
 * Pagination par curseur simulée ici via page/perPage (le backend suit le
 * même contrat que le futur module Feed, cf. stratégie de cache : curseur
 * plutôt qu'offset pour les listes à fort volume — ici la volumétrie par
 * utilisateur reste raisonnable, offset est donc acceptable pour ce
 * module précis).
 */
export function useFollowersList(userId: string) {
  return useInfiniteQuery({
    queryKey: ['followers', userId],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fetchFollowers(userId, pageParam);
      if (!result.success) throw new Error(result.error.message);
      return { items: result.data, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.items.length === 20 ? lastPage.page + 1 : undefined),
    enabled: Boolean(userId),
  });
}

export function useFollowingList(userId: string) {
  return useInfiniteQuery({
    queryKey: ['following', userId],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fetchFollowing(userId, pageParam);
      if (!result.success) throw new Error(result.error.message);
      return { items: result.data, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.items.length === 20 ? lastPage.page + 1 : undefined),
    enabled: Boolean(userId),
  });
}
