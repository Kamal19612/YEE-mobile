import { useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { inviteToGroup } from '../../api/groups'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { UserPicker } from '../../components/ui/UserPicker'
import { groupRoleOptions } from '../../data/groupsData'
import { useAuth } from '../../hooks/useAuth'
import { useFeed } from '../../hooks/useFeed'
import {
  useGroup,
  useGroupMembership,
  useGroupMembers,
} from '../../hooks/useGroups'
import { FeedComposer } from '../activity/FeedComposer'
import { FeedPostCard } from '../activity/FeedPostCard'
import { ActivityPlaceholder } from '../activity/ActivityPlaceholder'
import { GroupMembershipActions } from './GroupCard'

function isModerator(role) {
  return role === 'moderator' || role === 'admin'
}

/** Page détail groupe — App API Groups + Feed filtré */
export function GroupPage() {
  const { t } = useTranslation()
  const { groupId } = useParams()
  const { group, setGroup, loading, error } = useGroup(groupId)
  const { join, leave, respondToInvitation, actionError } = useGroupMembership(groupId, {
    group,
    setGroup,
  })
  const [busy, setBusy] = useState(false)

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
        <Button as={Link} to="/groups" size="sm" className="mt-4">
          {t('groups.backToDirectory')}
        </Button>
      </div>
    )
  }

  const canModerate = isModerator(group.viewerRole)
  const isActive = group.viewerStatus === 'active'

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } catch {
      /* actionError du hook */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bp-wrap w-full">
      <GroupHeader
        group={group}
        busy={busy}
        onJoin={() => run(join)}
        onLeave={() => run(leave)}
        onRespond={(accept) => run(() => respondToInvitation(accept))}
      />
      {actionError && (
        <div className="bb-card mb-4 p-3 text-bb-sm text-bb-danger">{actionError}</div>
      )}
      <GroupNav groupId={group.id} isActive={isActive} canModerate={canModerate} />
      <div id="item-body" className="item-body">
        <Routes>
          <Route
            index
            element={<GroupFeed group={group} canPost={isActive} />}
          />
          <Route path="members" element={<GroupMembersTab group={group} />} />
          <Route
            path="moderation"
            element={
              canModerate ? (
                <GroupModeration group={group} />
              ) : (
                <Navigate to=".." replace />
              )
            }
          />
          <Route
            path="invite"
            element={
              isActive ? <GroupInvite group={group} /> : <Navigate to=".." replace />
            }
          />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  )
}

function GroupHeader({ group, onJoin, onLeave, onRespond, busy }) {
  const { t } = useTranslation()
  const visibility = group.visibility || 'public'
  const statusLabel =
    visibility === 'public'
      ? t('groups.status.publicGroup')
      : visibility === 'private'
        ? t('groups.status.privateGroup')
        : t('groups.status.secretGroup')

  return (
    <div
      id="item-header"
      className="groups-header single-headers mb-5 overflow-hidden rounded-bb border border-bb-border bg-bb-content"
    >
      <div className="bb-item-header-cover relative z-0">
        {group.coverUrl ? (
          <img
            src={group.coverUrl}
            alt=""
            className="bb-item-header-cover-img"
            decoding="async"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--bb-cover-image-background-color)' }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="bb-item-header-body flex flex-col gap-4 bb:flex-row bb:items-end">
        <div className="bb-item-header-avatar">
          <Avatar
            name={group.name}
            src={group.coverUrl}
            size="xl"
            className="!h-[100px] !w-[100px] ring-4 ring-bb-content sm:!h-[120px] sm:!w-[120px]"
          />
        </div>
        <div className="bb-item-header-content">
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{group.name}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{group.description}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-bb-xs text-bb-muted">
            <span>{statusLabel}</span>
            <span>
              {t(
                group.membersCount === 1
                  ? 'groups.membersCount_one'
                  : 'groups.membersCount_other',
                { count: group.membersCount },
              )}
            </span>
            {group.viewerRole && (
              <span>
                {t('groups.yourRole')}: {t(`groups.roles.${group.viewerRole}`)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 pb-1">
          {group.viewerStatus === 'active' && (
            <Button as={Link} to={`/groups/${group.id}/invite`} size="sm" variant="secondary">
              {t('groups.invite')}
            </Button>
          )}
          <GroupMembershipActions
            group={group}
            busy={busy}
            onJoin={onJoin}
            onLeave={onLeave}
            onRespondInvitation={onRespond}
          />
        </div>
      </div>
    </div>
  )
}

function GroupNav({ groupId, isActive, canModerate }) {
  const { t } = useTranslation()
  const tabs = [
    { id: 'feed', label: t('groups.tabs.feed'), to: `/groups/${groupId}`, end: true },
    { id: 'members', label: t('groups.tabs.members'), to: `/groups/${groupId}/members` },
  ]
  if (canModerate) {
    tabs.push({
      id: 'moderation',
      label: t('groups.tabs.moderation'),
      to: `/groups/${groupId}/moderation`,
    })
  }
  if (isActive) {
    tabs.push({
      id: 'invite',
      label: t('groups.tabs.invite'),
      to: `/groups/${groupId}/invite`,
    })
  }

  return (
    <nav className="mb-5 rounded-bb border border-bb-border bg-bb-content" aria-label={t('groups.menu')}>
      <ul className="bb-scroll-tabs m-0 list-none p-0">
        {tabs.map((tab) => (
          <li key={tab.id} className="shrink-0">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive: active }) =>
                clsx(
                  'block whitespace-nowrap border-b-2 px-3 py-3 text-bb-sm font-medium sm:px-4',
                  active
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

function GroupFeed({ group, canPost }) {
  const { t } = useTranslation()
  const canViewFeed = group.visibility === 'public' || group.viewerStatus === 'active'
  const {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    createPost,
    toggleLike,
    deletePost,
    loadComments,
    addComment,
    removeComment,
  } = useFeed({ perPage: 10, groupId: group.id, enabled: canViewFeed })

  if (!canViewFeed) {
    return (
      <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
        {t('groups.membersOnlyContent')}
      </div>
    )
  }

  return (
    <div className="max-w-content">
      {canPost && <FeedComposer onSubmit={createPost} />}

      {loading && (
        <>
          <ActivityPlaceholder />
          <ActivityPlaceholder />
        </>
      )}

      {!loading && error && (
        <div className="bb-card mb-5 p-4 text-bb-sm text-bb-danger">{error}</div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="bb-card mb-5 p-8 text-center text-bb-sm text-bb-muted">
          {t('groups.activityEmpty')}
        </div>
      )}

      {!loading && (
        <ul className="activity-list bp-list m-0 list-none p-0">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              onLike={toggleLike}
              onDelete={deletePost}
              onLoadComments={loadComments}
              onAddComment={addComment}
              onDeleteComment={removeComment}
            />
          ))}
        </ul>
      )}

      {!loading && hasMore && (
        <div className="load-more flex justify-center py-2">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}

function GroupMembersTab({ group }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const canViewMembers = group.visibility === 'public' || group.viewerStatus === 'active'
  const canModerate = isModerator(group.viewerRole)
  const { members, loading, error } = useGroupMembers(
    canViewMembers ? group.id : null,
    'active',
  )

  if (!canViewMembers) {
    return (
      <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
        {t('groups.membersOnlyContent')}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-bb bg-bb-alt" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
  }

  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((m) => (
        <li key={m.user.id} className="bb-card flex items-center gap-3 p-4">
          <Link to={`/members/${m.user.id}`}>
            <Avatar name={m.user.displayName} src={m.user.avatarUrl} size="lg" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/members/${m.user.id}`}
              className="font-medium text-bb-heading hover:text-bb-primary"
            >
              {m.user.displayName}
            </Link>
            <div className="text-bb-xs text-bb-muted">
              {t(`groups.roles.${m.role}`)}
              {user && String(user.id) === String(m.user.id) ? ` · ${t('groups.you')}` : ''}
            </div>
            {m.user.profession && (
              <div className="truncate text-bb-xs text-bb-muted">{m.user.profession}</div>
            )}
          </div>
        </li>
      ))}
      {!members.length && (
        <li className="bb-card col-span-full p-8 text-center text-bb-sm text-bb-muted">
          {t('groups.noMembers')}
        </li>
      )}
      {canModerate && members.length > 0 && (
        <li className="col-span-full text-bb-xs text-bb-muted">{t('groups.moderationHint')}</li>
      )}
    </ul>
  )
}

function GroupModeration({ group }) {
  const { t } = useTranslation()
  const isAdmin = group.viewerRole === 'admin'
  const pending = useGroupMembers(group.id, 'pending')
  const active = useGroupMembers(group.id, 'active')
  const [localError, setLocalError] = useState(null)

  const wrap = async (fn) => {
    setLocalError(null)
    try {
      await fn()
    } catch (err) {
      setLocalError(err.message || t('groups.moderationFailed'))
    }
  }

  return (
    <div className="space-y-6">
      {(localError || pending.actionError || active.actionError) && (
        <div className="bb-card p-3 text-bb-sm text-bb-danger">
          {localError || pending.actionError || active.actionError}
        </div>
      )}

      <section>
        <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">
          {t('groups.pendingRequests')}
        </h2>
        {pending.loading && (
          <div className="h-16 animate-pulse rounded-bb bg-bb-alt" />
        )}
        {!pending.loading && pending.members.length === 0 && (
          <p className="m-0 text-bb-sm text-bb-muted">{t('groups.noPending')}</p>
        )}
        <ul className="m-0 list-none space-y-2 p-0">
          {pending.members.map((m) => (
            <li
              key={m.user.id}
              className="bb-card flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={m.user.displayName} src={m.user.avatarUrl} size="md" />
                <div>
                  <div className="text-bb-sm font-medium text-bb-heading">{m.user.displayName}</div>
                  {m.user.profession && (
                    <div className="text-bb-xs text-bb-muted">{m.user.profession}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    wrap(async () => {
                      await pending.approve(m.user.id)
                      await active.reload()
                    })
                  }
                >
                  {t('groups.approve')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => wrap(() => pending.reject(m.user.id))}
                >
                  {t('groups.reject')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">
          {t('groups.manageMembers')}
        </h2>
        {active.loading && (
          <div className="h-16 animate-pulse rounded-bb bg-bb-alt" />
        )}
        <ul className="m-0 list-none space-y-2 p-0">
          {active.members.map((m) => (
            <li
              key={m.user.id}
              className="bb-card flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.user.displayName} src={m.user.avatarUrl} size="md" />
                <div className="min-w-0">
                  <div className="truncate text-bb-sm font-medium text-bb-heading">
                    {m.user.displayName}
                  </div>
                  <div className="text-bb-xs text-bb-muted">{t(`groups.roles.${m.role}`)}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <select
                    value={m.role}
                    onChange={(e) => wrap(() => active.changeRole(m.user.id, e.target.value))}
                    className="h-9 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm"
                    aria-label={t('groups.changeRole')}
                  >
                    {groupRoleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {t(r.labelKey)}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => wrap(() => active.remove(m.user.id))}
                >
                  {t('groups.removeMember')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function GroupInvite({ group }) {
  const { t } = useTranslation()
  const [selectedUser, setSelectedUser] = useState(null)
  const [pickerKey, setPickerKey] = useState(0)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  return (
    <div className="bb-card max-w-lg p-4">
      <h2 className="m-0 mb-2 text-bb-md font-semibold text-bb-heading">{t('groups.invite')}</h2>
      <p className="m-0 mb-3 text-bb-sm text-bb-muted">{t('groups.inviteHint')}</p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!selectedUser?.id) return
          setSending(true)
          setError(null)
          setMessage(null)
          try {
            await inviteToGroup(group.id, selectedUser.id)
            setMessage(t('groups.invitesSent'))
            setSelectedUser(null)
            setPickerKey((k) => k + 1)
          } catch (err) {
            setError(err.message || t('groups.inviteFailed'))
          } finally {
            setSending(false)
          }
        }}
      >
        <UserPicker
          key={pickerKey}
          value={selectedUser}
          onChange={setSelectedUser}
          disabled={sending}
          placeholder={t('groups.inviteUserSearchPlaceholder')}
        />
        <Button type="submit" size="sm" disabled={sending || !selectedUser?.id}>
          {sending ? t('common.loading') : t('groups.sendInvites')}
        </Button>
      </form>
      {message && <p className="m-0 mt-3 text-bb-sm text-bb-success">{message}</p>}
      {error && <p className="m-0 mt-3 text-bb-sm text-bb-danger">{error}</p>}
    </div>
  )
}
