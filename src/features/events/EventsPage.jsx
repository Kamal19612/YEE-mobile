import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconGlobe, IconMapPin, IconSearch } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useEventCategories, useEvents } from '../../hooks/useEvents'
import { EventHeroCard } from './EventHeroCard'
import { localInputToIso } from './eventUtils'

/** Annuaire Événements — API `/events` (curation admin). */
export function EventsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isSiteAdmin)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [temporal, setTemporal] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState(null)

  const [title, setTitle] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [locationType, setLocationType] = useState('online')
  const [joinUrl, setJoinUrl] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [startsAtLocal, setStartsAtLocal] = useState('')
  const [endsAtLocal, setEndsAtLocal] = useState('')
  const [coverType, setCoverType] = useState('photo')
  const [videoUrl, setVideoUrl] = useState('')
  const [coverPhoto, setCoverPhoto] = useState(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState(null)

  const [catName, setCatName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [categoryBusy, setCategoryBusy] = useState(false)
  const [categoryFormError, setCategoryFormError] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    actionError: categoryActionError,
    add: addCategory,
    patch: patchCategory,
    remove: removeCategory,
  } = useEventCategories()

  const { events, loading, error, actionError, add, remove } = useEvents({
    category: categoryId,
    status: temporal,
    search: debouncedSearch,
  })

  useEffect(() => {
    if (!newCategoryId && categories.length > 0) {
      setNewCategoryId(categories[0].id)
    }
  }, [categories, newCategoryId])

  const grouped = useMemo(() => {
    const order = categories.map((c) => c.id)
    const map = new Map(order.map((id) => [id, []]))
    const orphan = []
    for (const event of events) {
      if (map.has(event.categoryId)) map.get(event.categoryId).push(event)
      else orphan.push(event)
    }
    const sections = order
      .map((id) => {
        const cat = categories.find((c) => c.id === id)
        return { id, name: cat?.name || id, items: map.get(id) || [] }
      })
      .filter((g) => g.items.length > 0)
    if (orphan.length) {
      sections.push({ id: '_other', name: t('events.filters.otherCategory'), items: orphan })
    }
    return sections
  }, [events, categories, t])

  const activeFilterCount = (categoryId ? 1 : 0) + (temporal ? 1 : 0) + (debouncedSearch ? 1 : 0)

  const resetForm = () => {
    setTitle('')
    setNewCategoryId(categories[0]?.id || '')
    setDescription('')
    setLocationType('online')
    setJoinUrl('')
    setVenueAddress('')
    setStartsAtLocal('')
    setEndsAtLocal('')
    setCoverType('photo')
    setVideoUrl('')
    setCoverPhoto(null)
    setFormError(null)
  }

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('events.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('events.subtitle')}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {isAdmin && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setManageCategoriesOpen((v) => !v)}
              >
                {t('events.categoriesManage')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setCreateOpen((v) => !v)
                  setFormError(null)
                }}
              >
                {t('events.add')}
              </Button>
            </>
          )}
        </div>
      </header>

      {manageCategoriesOpen && isAdmin && (
        <section className="bb-card mb-5 space-y-3 p-4">
          <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('events.categoriesTitle')}</h2>
          <p className="m-0 text-bb-sm text-bb-muted">{t('events.categoriesHelp')}</p>

          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!catName.trim()) return
              setCategoryBusy(true)
              setCategoryFormError(null)
              try {
                await addCategory({ name: catName.trim() })
                setCatName('')
              } catch (err) {
                setCategoryFormError(err.message || t('events.categoryCreateFailed'))
              } finally {
                setCategoryBusy(false)
              }
            }}
          >
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
                {t('events.fields.categoryName')}
              </span>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                maxLength={120}
                placeholder={t('events.categoryNamePlaceholder')}
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>
            <Button type="submit" size="sm" disabled={categoryBusy || !catName.trim()}>
              {t('events.categoryCreate')}
            </Button>
          </form>

          {(categoryFormError || categoryActionError || categoriesError) && (
            <p className="m-0 text-bb-sm text-bb-danger">
              {categoryFormError ||
                categoryActionError?.message ||
                categoriesError?.message ||
                t('events.categoriesLoadFailed')}
            </p>
          )}

          {categoriesLoading ? (
            <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
          ) : categories.length === 0 ? (
            <p className="m-0 text-bb-sm text-bb-muted">{t('events.categoriesEmpty')}</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-bb-border rounded-bb-inner border border-bb-border p-0">
              {categories.map((cat) => (
                <li key={cat.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  {editingCategoryId === cat.id ? (
                    <form
                      className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        if (!editingName.trim()) return
                        setCategoryBusy(true)
                        setCategoryFormError(null)
                        try {
                          await patchCategory(cat.id, { name: editingName.trim() })
                          setEditingCategoryId(null)
                          setEditingName('')
                        } catch (err) {
                          setCategoryFormError(err.message || t('events.categoryUpdateFailed'))
                        } finally {
                          setCategoryBusy(false)
                        }
                      }}
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        maxLength={120}
                        className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={categoryBusy}>
                          {t('common.save')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={categoryBusy}
                          onClick={() => {
                            setEditingCategoryId(null)
                            setEditingName('')
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="m-0 font-medium text-bb-heading">{cat.name}</p>
                        <p className="m-0 text-bb-xs text-bb-muted">
                          {t('events.categoryEventCount', { count: cat.eventCount })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCategoryId(cat.id)
                            setEditingName(cat.name)
                          }}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setCategoryDeleteTarget(cat)}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {createOpen && isAdmin && (
        <section className="bb-card mb-5 space-y-3 p-4">
          <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('events.createTitle')}</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!title.trim() || !newCategoryId || !startsAtLocal || !endsAtLocal) {
                setFormError(t('events.formRequired'))
                return
              }
              if (locationType === 'online' && !joinUrl.trim()) {
                setFormError(t('events.formRequiredJoin'))
                return
              }
              if (locationType === 'in_person' && !venueAddress.trim()) {
                setFormError(t('events.formRequiredVenue'))
                return
              }
              if (coverType === 'photo' && !coverPhoto) {
                setFormError(t('events.formRequiredCoverPhoto'))
                return
              }
              if (coverType === 'video' && !videoUrl.trim()) {
                setFormError(t('events.formRequiredCoverVideo'))
                return
              }
              const startsAt = localInputToIso(startsAtLocal)
              const endsAt = localInputToIso(endsAtLocal)
              if (!startsAt || !endsAt) {
                setFormError(t('events.formRequired'))
                return
              }
              if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
                setFormError(t('events.formEndBeforeStart'))
                return
              }
              setCreating(true)
              setFormError(null)
              try {
                await add({
                  title: title.trim(),
                  categoryId: newCategoryId,
                  description: description.trim(),
                  locationType,
                  joinUrl: locationType === 'online' ? joinUrl.trim() : null,
                  venueAddress: locationType === 'in_person' ? venueAddress.trim() : null,
                  startsAt,
                  endsAt,
                  coverType,
                  videoUrl: coverType === 'video' ? videoUrl.trim() : null,
                  coverPhoto: coverType === 'photo' ? coverPhoto : null,
                })
                resetForm()
                setCreateOpen(false)
              } catch (err) {
                setFormError(err.message || t('events.createFailed'))
              } finally {
                setCreating(false)
              }
            }}
          >
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.title')}</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.category')}</span>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                required
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.location')}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocationType('online')}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 rounded-bb-inner border px-3 py-2 text-bb-sm font-medium transition',
                    locationType === 'online'
                      ? 'border-bb-primary bg-[rgba(var(--bb-primary-color-rgb),0.1)] text-bb-primary'
                      : 'border-bb-border bg-bb-content text-bb-muted hover:border-bb-primary/40',
                  )}
                  aria-pressed={locationType === 'online'}
                >
                  <IconGlobe className="h-4 w-4" />
                  {t('events.location.online')}
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType('in_person')}
                  className={clsx(
                    'flex flex-1 items-center justify-center gap-2 rounded-bb-inner border px-3 py-2 text-bb-sm font-medium transition',
                    locationType === 'in_person'
                      ? 'border-bb-primary bg-[rgba(var(--bb-primary-color-rgb),0.1)] text-bb-primary'
                      : 'border-bb-border bg-bb-content text-bb-muted hover:border-bb-primary/40',
                  )}
                  aria-pressed={locationType === 'in_person'}
                >
                  <IconMapPin className="h-4 w-4" />
                  {t('events.location.inPerson')}
                </button>
              </div>
            </div>

            {locationType === 'online' ? (
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.joinUrl')}</span>
                <input
                  type="url"
                  value={joinUrl}
                  onChange={(e) => setJoinUrl(e.target.value)}
                  placeholder="https://"
                  required
                  className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
                />
              </label>
            ) : (
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.venueAddress')}</span>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  maxLength={500}
                  required
                  className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.startsAt')}</span>
              <input
                type="datetime-local"
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
                required
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.endsAt')}</span>
              <input
                type="datetime-local"
                value={endsAtLocal}
                onChange={(e) => setEndsAtLocal(e.target.value)}
                required
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>

            <div className="block sm:col-span-2">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.cover')}</span>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCoverType('photo')}
                  className={clsx(
                    'flex-1 rounded-bb-inner border px-3 py-2 text-bb-sm font-medium',
                    coverType === 'photo'
                      ? 'border-bb-primary bg-[rgba(var(--bb-primary-color-rgb),0.1)] text-bb-primary'
                      : 'border-bb-border bg-bb-content text-bb-muted',
                  )}
                >
                  {t('events.cover.photo')}
                </button>
                <button
                  type="button"
                  onClick={() => setCoverType('video')}
                  className={clsx(
                    'flex-1 rounded-bb-inner border px-3 py-2 text-bb-sm font-medium',
                    coverType === 'video'
                      ? 'border-bb-primary bg-[rgba(var(--bb-primary-color-rgb),0.1)] text-bb-primary'
                      : 'border-bb-border bg-bb-content text-bb-muted',
                  )}
                >
                  {t('events.cover.video')}
                </button>
              </div>
              {coverType === 'photo' ? (
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setCoverPhoto(e.target.files?.[0] || null)}
                    className="w-full text-bb-sm"
                  />
                  <span className="mt-1 block text-bb-xs text-bb-muted">{t('events.coverPhotoHint')}</span>
                </label>
              ) : (
                <label className="block">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder={t('events.videoUrlPlaceholder')}
                    className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
                  />
                  <span className="mt-1 block text-bb-xs text-bb-muted">{t('events.videoUrlHint')}</span>
                </label>
              )}
            </div>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.description')}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={4000}
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>

            <p className="m-0 sm:col-span-2 text-bb-xs text-bb-muted">{t('events.attachAfterHint')}</p>

            {(formError || actionError) && (
              <p className="m-0 sm:col-span-2 text-bb-sm text-bb-danger">
                {formError || actionError?.message || t('events.createFailed')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={creating || categories.length === 0}>
                {creating ? t('common.publishing') : t('events.publish')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={creating}
                onClick={() => {
                  resetForm()
                  setCreateOpen(false)
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="text-bb-sm font-medium text-bb-primary hover:underline"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {t('events.filters.title')}
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        {activeFilterCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setCategoryId('')
              setTemporal('')
              setSearch('')
            }}
          >
            {t('events.filters.reset')}
          </Button>
        )}
      </div>

      {filtersOpen && (
        <section className="bb-card mb-5 grid gap-3 p-4 sm:grid-cols-3">
          <label className="relative block sm:col-span-1">
            <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.filters.searchLabel')}</span>
            <IconSearch className="pointer-events-none absolute left-3 top-[2.05rem] h-4 w-4 text-bb-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('events.search')}
              className="w-full rounded-bb-inner border border-bb-border bg-bb-content py-2 pl-9 pr-3 text-bb-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.fields.category')}</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
            >
              <option value="">{t('events.filters.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('events.filters.status')}</span>
            <select
              value={temporal}
              onChange={(e) => setTemporal(e.target.value)}
              className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
            >
              <option value="">{t('events.filters.allStatuses')}</option>
              <option value="upcoming">{t('events.status.upcoming')}</option>
              <option value="past">{t('events.status.past')}</option>
            </select>
          </label>
        </section>
      )}

      {loading ? (
        <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
      ) : error ? (
        <p className="m-0 text-bb-sm text-bb-danger">{error.message || t('events.loadFailed')}</p>
      ) : events.length === 0 ? (
        <p className="m-0 text-bb-sm text-bb-muted">{t('events.empty')}</p>
      ) : (
        <div className="space-y-8">
          {grouped.map((section) => (
            <section key={section.id}>
              <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">{section.name}</h2>
              <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
                {section.items.map((event) => (
                  <li key={event.id}>
                    <EventHeroCard
                      event={event}
                      showDelete={isAdmin}
                      onDelete={() => setDeleteTarget(event)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('events.deleteConfirmTitle')}
        body={t('events.deleteConfirmBody', { title: deleteTarget?.title || '' })}
        confirmLabel={t('events.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await remove(deleteTarget.id)
            setDeleteTarget(null)
          } catch {
            /* actionError déjà posé */
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(categoryDeleteTarget)}
        title={t('events.categoryDeleteConfirmTitle')}
        body={t('events.categoryDeleteConfirmBody', {
          name: categoryDeleteTarget?.name || '',
          count: categoryDeleteTarget?.eventCount || 0,
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setCategoryDeleteTarget(null)}
        onConfirm={async () => {
          if (!categoryDeleteTarget) return
          try {
            await removeCategory(categoryDeleteTarget.id)
            setCategoryDeleteTarget(null)
          } catch {
            /* actionError déjà posé */
          }
        }}
      />
    </div>
  )
}
