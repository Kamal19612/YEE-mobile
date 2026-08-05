import { apiClient } from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import type {
  ApiResult,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  AuthUser,
} from '../../../types/auth';

/**
 * Couche d'accès API pure : aucune logique de state ici (c'est le rôle des
 * hooks/du store). Chaque fonction retourne directement `response.data`,
 * qui respecte déjà le contrat ApiResult<T> défini côté backend.
 */

export async function registerRequest(payload: RegisterPayload): Promise<ApiResult<{ message: string }>> {
  const { data } = await apiClient.post(ENDPOINTS.auth.register, payload);
  return data;
}

export async function verifyEmailRequest(token: string): Promise<ApiResult<{ message: string }>> {
  const { data } = await apiClient.post(ENDPOINTS.auth.verifyEmail, { token });
  return data;
}

export async function loginRequest(payload: LoginPayload): Promise<ApiResult<LoginResponse>> {
  const { data } = await apiClient.post(ENDPOINTS.auth.login, payload);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post(ENDPOINTS.auth.logout);
}

export async function refreshRequest(): Promise<ApiResult<LoginResponse>> {
  const { data } = await apiClient.post(ENDPOINTS.auth.refresh);
  return data;
}

export async function forgotPasswordRequest(email: string): Promise<ApiResult<{ message: string }>> {
  const { data } = await apiClient.post(ENDPOINTS.auth.forgotPassword, { email });
  return data;
}

export async function resetPasswordRequest(token: string, newPassword: string): Promise<ApiResult<{ message: string }>> {
  const { data } = await apiClient.post(ENDPOINTS.auth.resetPassword, { token, newPassword });
  return data;
}

export async function fetchCurrentUser(): Promise<ApiResult<AuthUser>> {
  const { data } = await apiClient.get(ENDPOINTS.auth.me);
  return data;
}
