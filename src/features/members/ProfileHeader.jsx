import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { formatTimeSince } from '../activity/utils'

/** Référence: #item-header (members/single/home.php) */
export function ProfileHeader({ member, isOwn, onFriendToggle }) {
  return (
    <div
      id="item-header"
      role="complementary"
      data-bp-item-id={member.id}
      data-bp-item-component="members"
      className="users-header single-headers mb-5 overflow-hidden rounded-bb border border-bb-border bg-bb-content"
    >
      <div
        id="header-cover-image"
        className="h-40 bg-bb-cover bg-cover bg-center bb:h-52"
        style={
          member.cover
            ? { backgroundImage: `url(${member.cover})` }
            : { backgroundColor: 'var(--bb-cover-image-background-color)' }
        }
      />

      <div id="item-header-cover-image" className="relative px-4 pb-4 pt-0 bb:px-6">
        <div className="flex flex-col gap-4 bb:flex-row bb:items-end">
          <div className="item-header-avatar -mt-12 shrink-0">
            <Avatar
              name={member.displayName}
              src={member.avatar}
              size="xl"
              className="!h-[120px] !w-[120px] ring-4 ring-bb-content"
            />
          </div>

          <div id="item-header-content" className="min-w-0 flex-1 pb-1">
            <h2 className="user-nicename m-0 text-bb-xl font-semibold text-bb-heading">
              {member.displayName}
            </h2>
            <p className="m-0 text-bb-sm text-bb-muted">@{member.mentionName}</p>
            {member.bio && <p className="m-0 mt-2 max-w-xl text-bb-sm text-bb-text">{member.bio}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-bb-xs text-bb-muted">
              {member.location && <span>{member.location}</span>}
              <span>Joined {new Date(member.joined).toLocaleDateString()}</span>
              <span>
                {member.online ? (
                  <span className="text-bb-success">Online</span>
                ) : (
                  <>Active {formatTimeSince(member.lastActive)}</>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-1">
            {isOwn ? (
              <>
                <Button as={Link} to={`/members/${member.id}/settings`} variant="secondary" size="sm">
                  Account Settings
                </Button>
                <Button as={Link} to={`/members/${member.id}/profile`} variant="outline" size="sm">
                  Edit Profile
                </Button>
              </>
            ) : (
              <>
                <FriendAction member={member} onFriendToggle={onFriendToggle} />
                <Button as={Link} to="/messages" variant="outline" size="sm">
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-6 border-t border-bb-border pt-3 text-center">
          <Stat label="Friends" value={member.stats.friends} />
          <Stat label="Groups" value={member.stats.groups} />
          <Stat label="Activity" value={member.stats.activity} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-bb-md font-semibold text-bb-heading">{value}</div>
      <div className="text-bb-xs text-bb-muted">{label}</div>
    </div>
  )
}

function FriendAction({ member, onFriendToggle }) {
  if (member.friendshipStatus === 'is_friend') {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => onFriendToggle?.(member.id)}>
        Unfriend
      </Button>
    )
  }
  if (member.friendshipStatus === 'pending') {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => onFriendToggle?.(member.id)}>
        Cancel Request
      </Button>
    )
  }
  return (
    <Button type="button" size="sm" onClick={() => onFriendToggle?.(member.id)}>
      Add Friend
    </Button>
  )
}
