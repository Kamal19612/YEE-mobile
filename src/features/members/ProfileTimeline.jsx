import { demoActivities } from '../../data/activityData'
import { ActivityCard } from '../activity/ActivityCard'
import { ActivityComposer } from '../activity/ActivityComposer'
import { applyComment, buildStoryPost } from '../activity/storyHelpers'
import { useMemo, useState } from 'react'

export function ProfileTimeline({ member, isOwn }) {
  const author = {
    id: member.id,
    displayName: member.displayName,
    mentionName: member.mentionName,
    avatar: member.avatar,
  }

  const initial = useMemo(() => {
    const filtered = demoActivities.filter(
      (a) => a.userId === member.id || a.userName === member.displayName,
    )
    if (filtered.length) {
      return filtered.map((a) => ({
        ...a,
        status: a.status || 'published',
        userLink: `/members/${member.id}`,
      }))
    }
    return [
      {
        id: `profile-${member.id}`,
        userId: member.id,
        userName: member.displayName,
        userLink: `/members/${member.id}`,
        avatar: member.avatar,
        content: member.bio || `${member.displayName} a rejoint la plateforme AfrEA-YEE.`,
        date: member.joined,
        component: 'activity',
        type: 'story',
        privacy: 'public',
        status: 'published',
        favorited: false,
        favoriteCount: 0,
        commentCount: 0,
        edited: false,
        group: null,
        media: [],
        comments: [],
      },
    ]
  }, [member])

  const [posts, setPosts] = useState(initial)

  return (
    <div>
      {isOwn && (
        <ActivityComposer
          user={author}
          onSubmit={async (payload) => {
            setPosts((prev) => [
              buildStoryPost({
                user: author,
                payload: { ...payload, status: payload.status || 'pending' },
              }),
              ...prev,
            ])
          }}
        />
      )}

      <ul className="activity-list bp-list m-0 list-none p-0">
        {posts.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onLike={(id) =>
              setPosts((prev) =>
                prev.map((a) =>
                  a.id === id
                    ? {
                        ...a,
                        favorited: !a.favorited,
                        favoriteCount: a.favorited
                          ? Math.max(0, a.favoriteCount - 1)
                          : a.favoriteCount + 1,
                      }
                    : a,
                ),
              )
            }
            onComment={(activityId, payload) => {
              setPosts((prev) =>
                prev.map((a) => (a.id === activityId ? applyComment(a, payload, author) : a)),
              )
            }}
          />
        ))}
      </ul>
    </div>
  )
}
