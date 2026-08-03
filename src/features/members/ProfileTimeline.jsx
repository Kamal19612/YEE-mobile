import { demoActivities } from '../../data/activityData'
import { ActivityCard } from '../activity/ActivityCard'
import { ActivityComposer } from '../activity/ActivityComposer'
import { useMemo, useState } from 'react'

export function ProfileTimeline({ member, isOwn }) {
  const initial = useMemo(
    () => demoActivities.filter((a) => a.userId === member.id || a.userName === member.displayName),
    [member],
  )
  const [posts, setPosts] = useState(
    initial.length
      ? initial
      : [
          {
            id: `profile-${member.id}`,
            userId: member.id,
            userName: member.displayName,
            userLink: `#`,
            avatar: member.avatar,
            content: member.bio || `${member.displayName} joined the community.`,
            date: member.joined,
            component: 'activity',
            type: 'activity_update',
            privacy: 'public',
            favorited: false,
            favoriteCount: 0,
            commentCount: 0,
            edited: false,
            group: null,
            media: [],
            comments: [],
          },
        ],
  )

  return (
    <div>
      {isOwn && (
        <ActivityComposer
          user={{
            id: member.id,
            displayName: member.displayName,
            mentionName: member.mentionName,
            avatar: member.avatar,
          }}
          onSubmit={async ({ content, privacy, media, poll }) => {
            setPosts((prev) => [
              {
                id: Date.now(),
                userId: member.id,
                userName: member.displayName,
                userLink: `#`,
                avatar: member.avatar,
                content,
                date: new Date().toISOString(),
                component: 'activity',
                type: 'activity_update',
                privacy,
                favorited: false,
                favoriteCount: 0,
                commentCount: 0,
                edited: false,
                group: null,
                media: media || [],
                poll: poll || null,
                comments: [],
              },
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
            onComment={(activityId, { content, parentId = 0 }) => {
              const comment = {
                id: Date.now(),
                userId: member.id,
                userName: member.displayName,
                avatar: member.avatar,
                content,
                date: new Date().toISOString(),
                children: [],
              }
              setPosts((prev) =>
                prev.map((a) => {
                  if (a.id !== activityId) return a
                  if (!parentId) {
                    return {
                      ...a,
                      commentCount: a.commentCount + 1,
                      comments: [...(a.comments || []), comment],
                    }
                  }
                  return a
                })
              )
            }}
            onVotePoll={(activityId, optionId) => {
              setPosts((prev) =>
                prev.map((a) => {
                  if (a.id !== activityId || !a.poll || a.poll.votedOptionId) return a
                  return {
                    ...a,
                    poll: {
                      ...a.poll,
                      votedOptionId: optionId,
                      totalVotes: a.poll.totalVotes + 1,
                      options: a.poll.options.map((o) =>
                        o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
                      ),
                    },
                  }
                }),
              )
            }}
          />
        ))}
      </ul>
    </div>
  )
}
