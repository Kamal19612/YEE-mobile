/**
 * Centralise les chemins d'API. Aucun composant/hook ne doit écrire une URL
 * en dur : tout passe par ces constantes, pour n'avoir qu'un seul endroit à
 * modifier si le préfixe /app/v1 évolue.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://example.com/wp-json/app/v1';

export const ENDPOINTS = {
  auth: {
    register: '/auth/register',
    verifyEmail: '/auth/verify-email',
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
  },
  users: {
    me: '/users/me',
    mePassword: '/users/me/password',
    meAvatar: '/users/me/avatar',
    meCover: '/users/me/cover',
    profile: (id: string) => `/users/${id}`,
    follow: (id: string) => `/users/${id}/follow`,
    followers: (id: string) => `/users/${id}/followers`,
    following: (id: string) => `/users/${id}/following`,
  },
} as const;
