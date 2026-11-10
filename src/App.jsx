import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedLayout } from './layout/ProtectedLayout'
/** Parcours chaud : gardés en eager pour le 1er paint login → fil. */
import { ActivityPage } from './features/activity/ActivityPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'

/**
 * Charge une page exportée en named export (`export function X`).
 * Évite d’alourdir le bundle initial (messages, admin, PDF, etc.).
 */
function lazyNamed(importer, name) {
  return lazy(() => importer().then((m) => ({ default: m[name] })))
}

const VerifyEmailPage = lazyNamed(() => import('./features/auth/VerifyEmailPage'), 'VerifyEmailPage')
const ForgotPasswordPage = lazyNamed(
  () => import('./features/auth/ForgotPasswordPage'),
  'ForgotPasswordPage',
)
const ResetPasswordPage = lazyNamed(() => import('./features/auth/ResetPasswordPage'), 'ResetPasswordPage')
const ActivateAccountPage = lazyNamed(
  () => import('./features/auth/ActivateAccountPage'),
  'ActivateAccountPage',
)
const FeedPostPage = lazyNamed(() => import('./features/activity/FeedPostPage'), 'FeedPostPage')
const MembersPage = lazyNamed(() => import('./features/members/MembersPage'), 'MembersPage')
const ProfilePage = lazyNamed(() => import('./features/members/ProfilePage'), 'ProfilePage')
const GroupsPage = lazyNamed(() => import('./features/groups/GroupsPage'), 'GroupsPage')
const GroupPage = lazyNamed(() => import('./features/groups/GroupPage'), 'GroupPage')
const InstitutionsPage = lazyNamed(
  () => import('./features/institutions/InstitutionsPage'),
  'InstitutionsPage',
)
const InstitutionPage = lazyNamed(
  () => import('./features/institutions/InstitutionPage'),
  'InstitutionPage',
)
const EventsPage = lazyNamed(() => import('./features/events/EventsPage'), 'EventsPage')
const EventDetailPage = lazyNamed(() => import('./features/events/EventDetailPage'), 'EventDetailPage')
const ResourcesPage = lazyNamed(() => import('./features/resources/ResourcesPage'), 'ResourcesPage')
const ResourceDetailPage = lazyNamed(
  () => import('./features/resources/ResourceDetailPage'),
  'ResourceDetailPage',
)
const NotificationsPage = lazyNamed(
  () => import('./features/notifications/NotificationsPage'),
  'NotificationsPage',
)
const MessagesPage = lazyNamed(() => import('./features/messages/MessagesPage'), 'MessagesPage')
const SearchPage = lazyNamed(() => import('./features/search/SearchPage'), 'SearchPage')
const LegalPage = lazyNamed(() => import('./features/legal/LegalPage'), 'LegalPage')
const AdminGuard = lazyNamed(() => import('./features/admin/AdminGuard'), 'AdminGuard')
const AdminAccountsPage = lazyNamed(
  () => import('./features/admin/AdminAccountsPage'),
  'AdminAccountsPage',
)
const AdminAccountDetailPage = lazyNamed(
  () => import('./features/admin/AdminAccountDetailPage'),
  'AdminAccountDetailPage',
)
const AdminInstitutionsPage = lazyNamed(
  () => import('./features/admin/AdminInstitutionsPage'),
  'AdminInstitutionsPage',
)

function RouteFallback() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-10">
      <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
    </div>
  )
}

function LazyRoute({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}

/**
 * AfrEA-YEE — périmètre livré
 * Invité : pages d’auth. Connecté : fil, membres, groupes, institutions,
 * événements, ressources, messages, notifications, recherche (UI), admin, pages légales.
 *
 * Bundle : login/register + fil en eager ; le reste en chunks lazy (mobile 4G).
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/verify-email"
              element={
                <LazyRoute>
                  <VerifyEmailPage />
                </LazyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <LazyRoute>
                  <ForgotPasswordPage />
                </LazyRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <LazyRoute>
                  <ResetPasswordPage />
                </LazyRoute>
              }
            />
            <Route
              path="/activate-account"
              element={
                <LazyRoute>
                  <ActivateAccountPage />
                </LazyRoute>
              }
            />

            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<ActivityPage />} />
              <Route
                path="/feed/:postId"
                element={
                  <LazyRoute>
                    <FeedPostPage />
                  </LazyRoute>
                }
              />
              <Route path="/activity" element={<Navigate to="/" replace />} />
              <Route path="/stories" element={<Navigate to="/" replace />} />
              <Route
                path="/members"
                element={
                  <LazyRoute>
                    <MembersPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/members/:memberId/*"
                element={
                  <LazyRoute>
                    <ProfilePage />
                  </LazyRoute>
                }
              />
              <Route
                path="/groups"
                element={
                  <LazyRoute>
                    <GroupsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/groups/:groupId/*"
                element={
                  <LazyRoute>
                    <GroupPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/institutions"
                element={
                  <LazyRoute>
                    <InstitutionsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/institutions/:institutionId/*"
                element={
                  <LazyRoute>
                    <InstitutionPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/events"
                element={
                  <LazyRoute>
                    <EventsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/events/:eventId"
                element={
                  <LazyRoute>
                    <EventDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/resources"
                element={
                  <LazyRoute>
                    <ResourcesPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/resources/:resourceId"
                element={
                  <LazyRoute>
                    <ResourceDetailPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <LazyRoute>
                    <NotificationsPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <LazyRoute>
                    <MessagesPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/messages/:threadId"
                element={
                  <LazyRoute>
                    <MessagesPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <LazyRoute>
                    <SearchPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/legal/:pageId"
                element={
                  <LazyRoute>
                    <LegalPage />
                  </LazyRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <LazyRoute>
                    <AdminGuard />
                  </LazyRoute>
                }
              >
                <Route index element={<Navigate to="accounts" replace />} />
                <Route
                  path="accounts"
                  element={
                    <LazyRoute>
                      <AdminAccountsPage />
                    </LazyRoute>
                  }
                />
                <Route
                  path="accounts/:userId"
                  element={
                    <LazyRoute>
                      <AdminAccountDetailPage />
                    </LazyRoute>
                  }
                />
                <Route
                  path="institutions"
                  element={
                    <LazyRoute>
                      <AdminInstitutionsPage />
                    </LazyRoute>
                  }
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
