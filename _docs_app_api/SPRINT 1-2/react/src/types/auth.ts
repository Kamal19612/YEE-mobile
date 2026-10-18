/**
 * Types alignés sur le contrat JSON exposé par app/v1/auth/* côté backend.
 * Ils reflètent le format défini par ApiResponse::success()/error() côté
 * WordPress — jamais la structure interne de WordPress/BuddyPress.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export interface AuthUser {
  id: string;
  displayName: string;
  email: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}
