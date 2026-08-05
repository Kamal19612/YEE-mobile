export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  website?: string;
}

export interface ProfileStats {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PublicProfile {
  id: string;
  displayName: string;
  bio: string;
  profession: string;
  organization: string;
  location: string;
  socialLinks: SocialLinks;
  avatarUrl: string;
  coverUrl: string | null;
  stats: ProfileStats;
  joinedAt: string;
  /** Uniquement présent quand on consulte son propre profil (GET /users/me). */
  email?: string;
}

export interface UserListItem {
  id: string;
  displayName: string;
  avatarUrl: string;
  profession: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  profession?: string;
  organization?: string;
  location?: string;
  socialLinks?: SocialLinks;
}
