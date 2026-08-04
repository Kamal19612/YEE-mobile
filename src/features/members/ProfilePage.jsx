import { Navigate, Route, Routes, Link, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMember } from '../../hooks/useMembers'
import { ProfileAbout } from './ProfileAbout'
import { ProfileFriends } from './ProfileFriends'
import { ProfileGroups } from './ProfileGroups'
import { ProfileHeader } from './ProfileHeader'
import { ProfileInvites } from './ProfileInvites'
import { ProfileNav } from './ProfileNav'
import { ProfileNotifications } from './ProfileNotifications'
import { ProfileSettings } from './ProfileSettings'
import { ProfileTimeline } from './ProfileTimeline'

/** Référence: members/single/home.php */
export function ProfilePage() {
  const { memberId } = useParams()
  const { user } = useAuth()
  const { member, loading, error, updateXprofileField, toggleFriend } = useMember(memberId)
  const isOwn = Boolean(member && user && String(member.id) === String(user.id))

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-52 animate-pulse rounded-bb bg-bb-alt" />
        <div className="h-12 animate-pulse rounded-bb bg-bb-alt" />
        <div className="h-40 animate-pulse rounded-bb bg-bb-alt" />
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="bb-card w-full p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">Member not found</h1>
        <p className="m-0 text-bb-sm text-bb-muted">{error || 'This profile does not exist.'}</p>
        <Link to="/members" className="mt-4 inline-block text-bb-primary hover:underline">
          Retour à l’annuaire
        </Link>
      </div>
    )
  }

  return (
    <div className="bp-wrap w-full">
      <ProfileHeader member={member} isOwn={isOwn} onFriendToggle={toggleFriend} />
      <ProfileNav memberId={member.id} isOwn={isOwn} />

      <div id="item-body" className="item-body">
        <div className="item-body-inner">
          <Routes>
            <Route index element={<ProfileTimeline member={member} isOwn={isOwn} />} />
            <Route
              path="profile"
              element={
                <ProfileAbout
                  member={member}
                  isOwn={isOwn}
                  onSaveField={updateXprofileField}
                />
              }
            />
            <Route path="friends" element={<ProfileFriends member={member} />} />
            <Route path="groups" element={<ProfileGroups member={member} />} />
            <Route
              path="notifications"
              element={isOwn ? <ProfileNotifications /> : <Navigate to=".." replace />}
            />
            <Route
              path="invites"
              element={isOwn ? <ProfileInvites /> : <Navigate to=".." replace />}
            />
            <Route
              path="settings"
              element={isOwn ? <ProfileSettings member={member} /> : <Navigate to=".." replace />}
            />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
