import { useMemo, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useGroup } from '../../hooks/useGroups'
import { ActivityCard } from '../activity/ActivityCard'
import { ActivityComposer } from '../activity/ActivityComposer'
import { applyComment, buildStoryPost } from '../activity/storyHelpers'
import { formatTimeSince } from '../activity/utils'

function groupMembersFromGroup(group, t) {
  const adminIds = new Set((group.admins || []).map((a) => a.id))
  const admins = (group.admins || []).map((a) => ({ id: a.id, displayName: a.displayName, avatar: null }))
  const stubs = (group.memberIds || [])
    .filter((id) => !adminIds.has(id))
    .map((id) => ({ id, displayName: t('groups.memberFallback', { id }), avatar: null }))
  return [...admins, ...stubs]
}

/** Référence: groups/single/home.php + invite-anyone.php */
export function GroupPage() {
  const { t } = useTranslation()
  const { groupId } = useParams()
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest', avatar: null }
  const { group, loading, error, patch } = useGroup(groupId)

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-48 animate-pulse rounded-bb bg-bb-alt" />
        <div className="h-12 animate-pulse rounded-bb bg-bb-alt" />
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="bb-card w-full p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">{t('groups.notFound')}</h1>
        <p className="m-0 text-bb-sm text-bb-muted">{error || t('groups.notFoundHint')}</p>
      </div>
    )
  }

  const onToggle = () => {
    patch((g) => ({
      ...g,
      isMember: !g.isMember,
      membersCount: g.isMember ? Math.max(0, g.membersCount - 1) : g.membersCount + 1,
      memberIds: g.isMember
        ? (g.memberIds || []).filter((id) => id !== currentUser.id)
        : [...new Set([...(g.memberIds || []), currentUser.id])],
    }))
  }

  return (
    <div className="bp-wrap w-full">
      <GroupHeader group={group} onToggle={onToggle} />
      <GroupNav groupId={group.id} isMember={group.isMember} />
      <div id="item-body" className="item-body">
        <Routes>
          <Route index element={<GroupActivity group={group} />} />
          <Route path="members" element={<GroupMembers group={group} />} />
          <Route
            path="invite"
            element={
              group.isMember ? (
                <GroupInvite group={group} />
              ) : (
                <Navigate to=".." replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function GroupHeader({ group, onToggle }) {
  const { t } = useTranslation()
  const statusLabel =
    group.status === 'public'
      ? t('groups.status.publicGroup')
      : group.status === 'private'
        ? t('groups.status.privateGroup')
        : t('groups.status.hiddenGroup')

  return (
    <div
      id="item-header"
      className="groups-header single-headers mb-5 overflow-hidden rounded-bb border border-bb-border bg-bb-content"
    >
      <div
        className="h-40 bg-cover bg-center bb:h-52"
        style={
          group.cover
            ? { backgroundImage: `url(${group.cover})` }
            : { backgroundColor: 'var(--bb-cover-image-background-color)' }
        }
      />
      <div className="relative flex flex-col gap-4 px-4 pb-4 bb:flex-row bb:items-end bb:px-6">
        <div className="-mt-12 shrink-0">
          <Avatar name={group.name} src={group.avatar} size="xl" className="!h-[100px] !w-[100px] ring-4 ring-bb-content" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{group.name}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{group.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-bb-xs text-bb-muted">
            <span>{statusLabel}</span>
            <span>
              {t(
                group.membersCount === 1 ? 'groups.membersCount_one' : 'groups.membersCount_other',
                { count: group.membersCount },
              )}
            </span>
            <span>{t('common.active', { time: formatTimeSince(group.lastActive) })}</span>
          </div>
        </div>
        <div className="flex gap-2 pb-1">
          {group.isMember ? (
            <>
              <Button as={Link} to={`/groups/${group.id}/invite`} size="sm" variant="secondary">
                {t('groups.invite')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onToggle}>
                {t('groups.leaveGroup')}
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={onToggle}>
              {group.status === 'private' ? t('groups.requestJoin') : t('groups.join')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function GroupNav({ groupId, isMember }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'activity', label: t('groups.tabs.activity'), to: `/groups/${groupId}` },
    { id: 'members', label: t('groups.tabs.members'), to: `/groups/${groupId}/members` },
  ]
  if (isMember) tabs.push({ id: 'invite', label: t('groups.tabs.invite'), to: `/groups/${groupId}/invite` })

  return (
    <nav className="mb-5 rounded-bb border border-bb-border bg-bb-content" aria-label={t('groups.menu')}>
      <ul className="bb-scroll-tabs m-0 list-none p-0">
        {tabs.map((tab) => (
          <li key={tab.id} className="shrink-0">
            <NavLink
              to={tab.to}
              end={tab.id === 'activity'}
              className={({ isActive }) =>
                clsx(
                  'block whitespace-nowrap border-b-2 px-3 py-3 text-bb-sm font-medium sm:px-4',
                  isActive
                    ? 'border-bb-primary text-bb-primary'
                    : 'border-transparent text-bb-text hover:text-bb-heading',
                )
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function GroupActivity({ group }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest', avatar: null }
  const [posts, setPosts] = useState([])

  return (
    <div className="max-w-content">
      {group.isMember && (
        <ActivityComposer
          onSubmit={async (payload) => {
            setPosts((prev) => [
              buildStoryPost({
                user: currentUser,
                payload: { ...payload, status: payload.status || 'pending' },
                group: { id: group.id, name: group.name, avatar: group.avatar, link: `/groups/${group.id}` },
              }),
              ...prev,
            ])
          }}
        />
      )}
      <ul className="m-0 list-none p-0">
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
                prev.map((a) =>
                  a.id === activityId ? applyComment(a, payload, currentUser) : a,
                ),
              )
            }}
          />
        ))}
        {!posts.length && (
          <li className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('groups.activityEmpty')}</li>
        )}
      </ul>
    </div>
  )
}

function GroupMembers({ group }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest', avatar: null }
  const members = useMemo(() => groupMembersFromGroup(group, t), [group, t])

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <li key={m.id} className="bb-card flex items-center gap-3 p-4">
          <Link to={`/members/${m.id}`}>
            <Avatar name={m.displayName} src={m.avatar} size="lg" />
          </Link>
          <div>
            <Link to={`/members/${m.id}`} className="font-medium text-bb-heading hover:text-bb-primary">
              {m.displayName}
            </Link>
            <div className="text-bb-xs text-bb-muted">
              {group.admins?.some((a) => a.id === m.id)
                ? t('groups.organizer')
                : m.id === currentUser.id
                  ? t('groups.you')
                  : t('groups.member')}
            </div>
          </div>
        </li>
      ))}
      {!members.length && (
        <li className="bb-card col-span-full p-8 text-center text-bb-sm text-bb-muted">
          {t('groups.noMembers')}
        </li>
      )}
    </ul>
  )
}

function GroupInvite() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const [sent, setSent] = useState(false)

  const candidates = []

  const toggle = (member) => {
    setSelected((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member],
    )
  }

  return (
    <div className="bb-invite-anyone-wrap grid gap-4 bb:grid-cols-2">
      <div className="bb-card p-4">
        <h4 className="total-members-text m-0 mb-3 text-bb-md font-semibold text-bb-heading">
          {t('groups.tabs.members')}
        </h4>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('groups.searchMembers')}
          className="send-to-input mb-3 h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
        />
        <div className="bb-select-members-text mb-2 text-bb-sm font-semibold text-bb-heading">
          {t('groups.selectMembers')}
        </div>
        <ul id="invite-anyone-member-list" className="m-0 max-h-80 list-none space-y-1 overflow-y-auto p-0">
          {candidates.map((m) => (
            <li key={m.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-bb-inner px-2 py-2 hover:bg-bb-alt">
                <input
                  type="checkbox"
                  checked={selected.some((s) => s.id === m.id)}
                  onChange={() => toggle(m)}
                />
                <Avatar name={m.displayName} src={m.avatar} size="sm" />
                <span className="text-bb-sm text-bb-heading">{m.displayName}</span>
              </label>
            </li>
          ))}
          {!candidates.length && (
            <li className="px-2 py-4 text-bb-sm text-bb-muted">{t('groups.membersEmpty')}</li>
          )}
        </ul>
      </div>

      <div className="bb-card p-4">
        <div className="mb-3 rounded-bb-inner bg-[rgba(var(--bb-primary-color-rgb),0.08)] px-3 py-2 text-bb-sm text-bb-heading">
          {t('groups.inviteHint')}
        </div>
        <ul id="invite-anyone-invite-list" className="m-0 mb-4 min-h-[120px] list-none space-y-2 p-0">
          {selected.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-bb-inner bg-bb-alt px-3 py-2">
              <span className="text-bb-sm text-bb-heading">{m.displayName}</span>
              <button type="button" className="text-bb-xs text-bb-danger" onClick={() => toggle(m)}>
                {t('common.remove')}
              </button>
            </li>
          ))}
          {!selected.length && (
            <li className="text-bb-sm text-bb-muted">{t('groups.noInvitesSelected')}</li>
          )}
        </ul>
        {sent && <div className="mb-3 text-bb-sm text-bb-success">{t('groups.invitesSent')}</div>}
        <Button
          type="button"
          size="sm"
          disabled={!selected.length}
          onClick={() => {
            setSent(true)
            setSelected([])
            setTimeout(() => setSent(false), 2000)
          }}
        >
          {t('groups.sendInvites')}
        </Button>
      </div>
    </div>
  )
}
