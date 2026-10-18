import { apiClient } from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import type { ApiResult } from '../../../types/auth';
import type { PublicProfile, UpdateProfilePayload, UserListItem } from '../../../types/profile';

export async function fetchMyProfile(): Promise<ApiResult<PublicProfile>> {
  const { data } = await apiClient.get(ENDPOINTS.users.me);
  return data;
}

export async function fetchPublicProfile(userId: string): Promise<ApiResult<PublicProfile>> {
  const { data } = await apiClient.get(ENDPOINTS.users.profile(userId));
  return data;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ApiResult<PublicProfile>> {
  const { data } = await apiClient.patch(ENDPOINTS.users.me, payload);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResult<{ message: string }>> {
  const { data } = await apiClient.put(ENDPOINTS.users.mePassword, { currentPassword, newPassword });
  return data;
}

export async function deleteMyAccount(password: string): Promise<ApiResult<{ message: string }>> {
  // Axios n'envoie pas de body sur DELETE par défaut : il faut le passer
  // explicitement dans `data` au sein de la config.
  const { data } = await apiClient.delete(ENDPOINTS.users.me, { data: { password } });
  return data;
}

export async function uploadAvatar(file: File): Promise<ApiResult<{ url: string }>> {
  const formData = new FormData();
  formData.append('avatar', file);
  const { data } = await apiClient.post(ENDPOINTS.users.meAvatar, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadCover(file: File): Promise<ApiResult<{ url: string }>> {
  const formData = new FormData();
  formData.append('cover', file);
  const { data } = await apiClient.post(ENDPOINTS.users.meCover, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function followUser(userId: string): Promise<ApiResult<{ following: boolean }>> {
  const { data } = await apiClient.post(ENDPOINTS.users.follow(userId));
  return data;
}

export async function unfollowUser(userId: string): Promise<ApiResult<{ following: boolean }>> {
  const { data } = await apiClient.delete(ENDPOINTS.users.follow(userId));
  return data;
}

export async function fetchFollowers(userId: string, page = 1): Promise<ApiResult<UserListItem[]>> {
  const { data } = await apiClient.get(ENDPOINTS.users.followers(userId), { params: { page } });
  return data;
}

export async function fetchFollowing(userId: string, page = 1): Promise<ApiResult<UserListItem[]>> {
  const { data } = await apiClient.get(ENDPOINTS.users.following(userId), { params: { page } });
  return data;
}
