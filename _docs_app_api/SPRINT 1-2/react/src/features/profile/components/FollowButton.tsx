import { useFollowToggle } from '../hooks/useFollow';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
}

export function FollowButton({ userId, isFollowing }: FollowButtonProps) {
  const { mutate, isPending } = useFollowToggle(userId);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => mutate(!isFollowing)}
      className={
        isFollowing
          ? 'rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'
          : 'rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50'
      }
    >
      {isFollowing ? 'Ne plus suivre' : 'Suivre'}
    </button>
  );
}
