import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconSearch } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { groupTypeFilters, groupVisibilityOptions } from '../../data/groupsData'
import { useAuth } from '../../hooks/useAuth'
import { useGroups } from '../../hooks/useGroups'
import { useManagedInstitutions } from '../../hooks/useInstitutions'
import { GroupCard } from './GroupCard'

/** Annuaire des groupes — App API `/groups` */
export function GroupsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState('grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newVisibility, setNewVisibility] = useState('public')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [leaveTarget, setLeaveTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const mine = typeFilter === 'mine'
  const {
    groups,
    total,
    loading,
    error,
    actionError,
    createGroup,
    join,
    leave,
    respondToInvitation,
    removeGroup,
  } = useGroups({ search: debouncedSearch, mine })
  const { institutions: managedInstitutions, loading: referentLoading } = useManagedInstitutions(
    Boolean(user) && !user?.isSiteAdmin,
  )
  const canCreateGroup = Boolean(
    user && (user.isSiteAdmin || managedInstitutions.length > 0),
  )

  const runAction = async (id, fn) => {
    setBusyId(id)
    try {
      await fn()
    } catch {
      /* actionError déjà posé par le hook — message serveur affiché */
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('groups.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('groups.subtitle')}</p>
        </div>
        {user && (user.isSiteAdmin || !referentLoading) && canCreateGroup && (
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => setCreateOpen((v) => !v)}>
            {t('groups.create')}
          </Button>
        )}
        {user && !referentLoading && !canCreateGroup && (
          <p className="m-0 w-full text-left text-bb-sm text-bb-muted bb:max-w-xs bb:text-right">
            {t('groups.createReferentOnly')}{' '}
            <Link to={user?.id ? `/members/${user.id}/institutions` : '/members'} className="text-bb-primary hover:underline">
              {t('groups.createReferentLink')}
            </Link>
          </p>
        )}
      </header>

      {createOpen && canCreateGroup && (
        <form
          className="bb-card mb-5 space-y-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!newName.trim()) return
            setCreating(true)
            setFormError(null)
            try {
              const g = await createGroup({
                name: newName.trim(),
                description: newDesc.trim(),
                visibility: newVisibility,
              })
              setCreateOpen(false)
              setNewName('')
              setNewDesc('')
              setNewVisibility('public')
              navigate(`/groups/${g.id}`)
            } catch (err) {
              const code = err.code || err.body?.error?.code
              setFormError(
                code === 'forbidden'
                  ? t('groups.createReferentOnly')
                  : err.message || t('groups.createFailed'),
              )
            } finally {
              setCreating(false)
            }
          }}
        >
          <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{t('groups.createTitle')}</h2>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('groups.namePlaceholder')}
            required
            className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder={t('groups.descriptionPlaceholder')}
            rows={3}
            className="w-full rounded-bb-input border border-bb-border px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
          />
          <fieldset className="m-0 space-y-2 border-0 p-0">
            <legend className="mb-1 text-bb-sm font-medium text-bb-heading">
              {t('groups.visibility.label')}
            </legend>
            {groupVisibilityOptions.map((opt) => (
              <label
                key={opt.id}
                className={clsx(
                  'flex cursor-pointer gap-3 rounded-bb-inner border px-3 py-2',
                  newVisibility === opt.id
                    ? 'border-bb-primary bg-[rgba(var(--bb-primary-color-rgb),0.06)]'
                    : 'border-bb-border',
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.id}
                  checked={newVisibility === opt.id}
                  onChange={() => setNewVisibility(opt.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-bb-sm font-medium text-bb-heading">{t(opt.labelKey)}</span>
                  <span className="block text-bb-xs text-bb-muted">{t(opt.hintKey)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {formError && <p className="m-0 text-bb-sm text-bb-danger">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? t('common.loading') : t('common.create')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}

      <div className="mb-5 flex flex-col gap-3 bb:flex-row bb:items-center bb:justify-between">
        <div className="bb-item-count text-bb-sm text-bb-text">
          {t(total === 1 ? 'groups.count_one' : 'groups.count_other', { count: total })}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative block w-full min-w-0 sm:min-w-[180px] sm:flex-1 bb:max-w-sm">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('groups.search')}
              className="h-10 w-full rounded-bb-input border border-bb-border bg-bb-content py-1.5 pl-9 pr-3 text-bb-sm outline-none focus:border-bb-primary"
            />
          </label>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-bb-input border border-bb-border bg-bb-content px-2 text-bb-sm sm:flex-none"
            >
              {groupTypeFilters.map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.labelKey)}
                </option>
              ))}
            </select>
            <div className="flex shrink-0 overflow-hidden rounded-bb-input border border-bb-border">
              {['grid', 'list'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`min-h-10 px-3 py-1.5 text-bb-xs font-medium ${
                    view === v ? 'bg-bb-primary text-white' : 'bg-bb-content text-bb-text'
                  }`}
                >
                  {t(v === 'grid' ? 'members.grid' : 'members.list')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="bb-card mb-4 p-3 text-bb-sm text-bb-danger">{actionError}</div>
      )}

      {loading && (
        <div className="grid grid-cols-1 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,14rem))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-bb border border-bb-border bg-bb-content" />
          ))}
        </div>
      )}

      {!loading && error && !actionError && (
        <div className="bb-card p-4 text-bb-sm text-bb-danger">{error}</div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('groups.empty')}</div>
      )}

      {!loading && groups.length > 0 && (
        <ul
          id="groups-list"
          className={clsx(
            'm-0 list-none p-0',
            view === 'grid'
              ? 'grid grid-cols-1 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12.5rem,14rem))]'
              : 'flex flex-col gap-3',
          )}
        >
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              view={view}
              busy={busyId === group.id}
              canDelete={Boolean(user?.isSiteAdmin)}
              onJoin={(id) => runAction(id, () => join(id))}
              onLeave={(id) => setLeaveTarget(groups.find((g) => String(g.id) === String(id)) || { id })}
              onDelete={(g) => setDeleteTarget(g)}
              onRespondInvitation={(id, accept) =>
                runAction(id, () => respondToInvitation(id, accept))
              }
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(leaveTarget)}
        title={t('groups.leaveConfirmTitle')}
        body={t('groups.leaveConfirmBody')}
        confirmLabel={t('groups.leaveGroup')}
        confirming={Boolean(leaveTarget && busyId === leaveTarget.id)}
        onCancel={() => {
          if (!busyId) setLeaveTarget(null)
        }}
        onConfirm={async () => {
          if (!leaveTarget) return
          await runAction(leaveTarget.id, () => leave(leaveTarget.id))
          setLeaveTarget(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('groups.deleteConfirmTitle')}
        body={t('groups.deleteConfirmBody', { name: deleteTarget?.name || '' })}
        confirmLabel={t('groups.delete')}
        confirming={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onCancel={() => {
          if (!busyId) setDeleteTarget(null)
        }}
        onConfirm={async () => {
          if (!deleteTarget) return
          await runAction(deleteTarget.id, () => removeGroup(deleteTarget.id))
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
