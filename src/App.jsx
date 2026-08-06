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
import { NotificationsPage } from './features/notifications/NotificationsPage'
import { SearchPage } from './features/search/SearchPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'

/**
 * AfrEA-YEE — périmètre TDR juillet 2026
 * Invité : pages d’auth seules (sans shell). Connecté : app complète.
 * Hors scope / masqués : Forums, Resources, Messages, Moderation, Shop, Courses, Events, Jobs, Memberships
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
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/search" element={<SearchPage />} />
            </Route>

            <Route path="/messages" element={<Navigate to="/" replace />} />
            <Route path="/messages/*" element={<Navigate to="/" replace />} />
            <Route path="/forums" element={<Navigate to="/" replace />} />
            <Route path="/forums/*" element={<Navigate to="/" replace />} />
            <Route path="/resources" element={<Navigate to="/" replace />} />
            <Route path="/resources/*" element={<Navigate to="/" replace />} />
            <Route path="/moderation" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
