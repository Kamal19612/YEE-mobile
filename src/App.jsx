import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedLayout } from './layout/ProtectedLayout'
import { ActivityPage } from './features/activity/ActivityPage'
import { FeedPostPage } from './features/activity/FeedPostPage'
import { MembersPage } from './features/members/MembersPage'
import { ProfilePage } from './features/members/ProfilePage'
import { GroupsPage } from './features/groups/GroupsPage'
import { GroupPage } from './features/groups/GroupPage'
import { InstitutionsPage } from './features/institutions/InstitutionsPage'
import { InstitutionPage } from './features/institutions/InstitutionPage'
import { EventsPage } from './features/events/EventsPage'
import { EventDetailPage } from './features/events/EventDetailPage'
import { ResourcesPage } from './features/resources/ResourcesPage'
import { ResourceDetailPage } from './features/resources/ResourceDetailPage'
import { NotificationsPage } from './features/notifications/NotificationsPage'
import { SearchPage } from './features/search/SearchPage'
import { AdminGuard } from './features/admin/AdminGuard'
import { AdminAccountsPage } from './features/admin/AdminAccountsPage'
import { AdminAccountDetailPage } from './features/admin/AdminAccountDetailPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { MessagesPage } from './features/messages/MessagesPage'
import { LegalPage } from './features/legal/LegalPage'

/**
 * AfrEA-YEE — périmètre livré
 * Invité : pages d’auth. Connecté : fil, membres, groupes, institutions,
 * événements, ressources, messages, notifications, recherche (UI), admin, pages légales.
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<ActivityPage />} />
              <Route path="/feed/:postId" element={<FeedPostPage />} />
              <Route path="/activity" element={<Navigate to="/" replace />} />
              <Route path="/stories" element={<Navigate to="/" replace />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/members/:memberId/*" element={<ProfilePage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:groupId/*" element={<GroupPage />} />
              <Route path="/institutions" element={<InstitutionsPage />} />
              <Route path="/institutions/:institutionId/*" element={<InstitutionPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:eventId" element={<EventDetailPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/resources/:resourceId" element={<ResourceDetailPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:threadId" element={<MessagesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/legal/:pageId" element={<LegalPage />} />
              <Route path="/admin" element={<AdminGuard />}>
                <Route index element={<Navigate to="accounts" replace />} />
                <Route path="accounts" element={<AdminAccountsPage />} />
                <Route path="accounts/:userId" element={<AdminAccountDetailPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
