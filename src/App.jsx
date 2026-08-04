import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { LayoutProvider } from './context/LayoutProvider'
import { AuthProvider } from './context/AuthProvider'
import { AppShell } from './layout/AppShell'
import { ActivityPage } from './features/activity/ActivityPage'
import { MembersPage } from './features/members/MembersPage'
import { ProfilePage } from './features/members/ProfilePage'
import { GroupsPage } from './features/groups/GroupsPage'
import { GroupPage } from './features/groups/GroupPage'
import { MessagesPage } from './features/messages/MessagesPage'
import { NotificationsPage } from './features/notifications/NotificationsPage'
import { ForumsPage } from './features/forums/ForumsPage'
import { ForumPage } from './features/forums/ForumPage'
import { TopicPage } from './features/forums/TopicPage'
import { SearchPage } from './features/search/SearchPage'
import { ModerationPage } from './features/moderation/ModerationPage'
import { ResourcesPage } from './features/resources/ResourcesPage'
import { LoginPage } from './features/auth/LoginPage'

/**
 * AfrEA-YEE — périmètre TDR juillet 2026
 * Hors scope : Shop, Courses, Events, Jobs, Memberships
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <AuthProvider>
          <LayoutProvider>
            <AppShell>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ActivityPage />} />
                <Route path="/activity" element={<Navigate to="/" replace />} />
                <Route path="/stories" element={<Navigate to="/" replace />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/members/:memberId/*" element={<ProfilePage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/:groupId/*" element={<GroupPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:threadId" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/forums" element={<ForumsPage />} />
                <Route path="/forums/:forumId" element={<ForumPage />} />
                <Route path="/forums/:forumId/topics/:topicId" element={<TopicPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/moderation" element={<ModerationPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </LayoutProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
