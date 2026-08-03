import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeProvider'
import { LayoutProvider } from './context/LayoutProvider'
import { CartProvider } from './context/CartProvider'
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
import { ShopPage } from './features/shop/ShopPage'
import { ProductPage } from './features/shop/ProductPage'
import { CartPage } from './features/shop/CartPage'
import { CheckoutPage } from './features/shop/CheckoutPage'
import { CoursesPage } from './features/courses/CoursesPage'
import { CoursePage } from './features/courses/CoursePage'
import { EventsPage } from './features/events/EventsPage'
import { EventPage } from './features/events/EventPage'
import { JobsPage } from './features/jobs/JobsPage'
import { JobPage } from './features/jobs/JobPage'
import { MembershipsPage } from './features/memberships/MembershipsPage'

export default function App() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <CartProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
            <AppShell>
              <Routes>
                <Route path="/" element={<ActivityPage />} />
                <Route path="/activity" element={<Navigate to="/" replace />} />
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
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/shop/cart" element={<CartPage />} />
                <Route path="/shop/checkout" element={<CheckoutPage />} />
                <Route path="/shop/:productId" element={<ProductPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:courseId" element={<CoursePage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:eventId" element={<EventPage />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:jobId" element={<JobPage />} />
                <Route path="/memberships" element={<MembershipsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </BrowserRouter>
        </CartProvider>
      </LayoutProvider>
    </ThemeProvider>
  )
}
