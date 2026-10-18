import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { IconSearch } from '../../components/icons'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { RESOURCE_DOCUMENT_ACCEPT, RESOURCE_LANGUAGES } from '../../data/resourcesData'
import { useAuth } from '../../hooks/useAuth'
import { useResourceCategories, useResources } from '../../hooks/useResources'
import { ResourceDocumentCard } from './ResourceDocumentCard'

function languageLabel(t, code) {
  const found = RESOURCE_LANGUAGES.find((l) => l.code === code)
  return found ? t(found.labelKey) : code
}

/** Annuaire Ressources — API `/resources` */
export function ResourcesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isSiteAdmin)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [language, setLanguage] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState(null)

  const [title, setTitle] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newLanguage, setNewLanguage] = useState('fr')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState(null)
  const [busyId, setBusyId] = useState(null)

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
    reload: reloadCategories,
  } = useResourceCategories()

  const { resources, loading, error, actionError, add, remove } = useResources({
    category: categoryId,
    language,
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
    for (const resource of resources) {
      if (map.has(resource.categoryId)) map.get(resource.categoryId).push(resource)
      else orphan.push(resource)
    }
    const sections = order
      .map((id) => {
        const cat = categories.find((c) => c.id === id)
        return { id, name: cat?.name || id, items: map.get(id) || [] }
      })
      .filter((g) => g.items.length > 0)
    if (orphan.length) {
      sections.push({ id: '_other', name: t('resources.filters.otherCategory'), items: orphan })
    }
    return sections
  }, [resources, categories, t])

  const activeFilterCount = (categoryId ? 1 : 0) + (language ? 1 : 0) + (debouncedSearch ? 1 : 0)

  const resetForm = () => {
    setTitle('')
    setNewCategoryId(categories[0]?.id || '')
    setNewLanguage('fr')
    setDescription('')
    setFile(null)
    setFormError(null)
  }

  return (
    <div id="buddypress" className="buddypress-wrap w-full">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{t('resources.title')}</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">{t('resources.subtitle')}</p>
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
                {t('resources.categoriesManage')}
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
                {t('resources.add')}
              </Button>
            </>
          )}
        </div>
      </header>

      {manageCategoriesOpen && isAdmin && (
        <section className="bb-card mb-5 space-y-3 p-4">
          <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('resources.categoriesTitle')}</h2>
          <p className="m-0 text-bb-sm text-bb-muted">{t('resources.categoriesHelp')}</p>

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
                setCategoryFormError(err.message || t('resources.categoryCreateFailed'))
              } finally {
                setCategoryBusy(false)
              }
            }}
          >
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
                {t('resources.fields.categoryName')}
              </span>
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                maxLength={120}
                placeholder={t('resources.categoryNamePlaceholder')}
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              />
            </label>
            <Button type="submit" size="sm" disabled={categoryBusy || !catName.trim()}>
              {t('resources.categoryCreate')}
            </Button>
          </form>

          {(categoryFormError || categoryActionError || categoriesError) && (
            <p className="m-0 text-bb-sm text-bb-danger">
              {categoryFormError ||
                categoryActionError?.message ||
                categoriesError?.message ||
                t('resources.categoriesLoadFailed')}
            </p>
          )}

          {categoriesLoading ? (
            <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
          ) : categories.length === 0 ? (
            <p className="m-0 text-bb-sm text-bb-muted">{t('resources.categoriesEmpty')}</p>
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
                          setCategoryFormError(err.message || t('resources.categoryUpdateFailed'))
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
                          {t('resources.categoryResourceCount', { count: cat.resourceCount })}
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
        <form
          className="bb-card mb-5 space-y-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!title.trim() || !file || !newCategoryId) {
              setFormError(t('resources.formRequired'))
              return
            }
            setCreating(true)
            setFormError(null)
            try {
              await add({
                title: title.trim(),
                categoryId: newCategoryId,
                language: newLanguage,
                description: description.trim(),
                file,
              })
              await reloadCategories()
              resetForm()
              setCreateOpen(false)
            } catch (err) {
              const msg =
                err.code === 'timeout' || /délai|timeout/i.test(String(err.message || ''))
                  ? t('resources.uploadTimeout')
                  : err.message || t('resources.createFailed')
              setFormError(msg)
            } finally {
              setCreating(false)
            }
          }}
        >
          <h2 className="m-0 text-bb-base font-semibold text-bb-heading">{t('resources.createTitle')}</h2>
          <label className="block">
            <span className="mb-1 block text-bb-xs font-medium text-bb-muted">{t('resources.fields.title')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
                {t('resources.fields.category')}
              </span>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
                {t('resources.fields.language')}
              </span>
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
              >
                {RESOURCE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {t(l.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
              {t('resources.fields.description')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-bb-inner border border-bb-border bg-bb-content px-3 py-2 text-bb-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
              {t('resources.fields.file')}
            </span>
            <input
              type="file"
              accept={RESOURCE_DOCUMENT_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-bb-sm"
              required
            />
            <span className="mt-1 block text-bb-xs text-bb-muted">{t('resources.pdfOnly')}</span>
          </label>
          {formError && <p className="m-0 text-bb-sm text-bb-danger">{formError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={creating || categories.length === 0}>
              {creating ? t('common.loading') : t('resources.publish')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={creating}
              onClick={() => {
                setCreateOpen(false)
                resetForm()
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-bb border border-bb-border bg-bb-content">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-3 text-left text-bb-sm font-semibold text-bb-heading"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <span>
                {t('resources.filters.title')}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
              <span className="text-bb-muted">{filtersOpen ? '−' : '+'}</span>
            </button>

            {filtersOpen && (
              <div className="space-y-4 border-t border-bb-border px-3 py-3">
                <label className="relative block">
                  <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
                    {t('resources.filters.searchLabel')}
                  </span>
                  <IconSearch className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-bb-muted" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('resources.search')}
                    className="w-full rounded-bb-inner border border-bb-border bg-bb-alt py-2 pl-9 pr-3 text-bb-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-bb-xs font-medium text-bb-muted">
                    {t('resources.fields.language')}
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-bb-inner border border-bb-border bg-bb-alt px-3 py-2 text-bb-sm"
                  >
                    <option value="">{t('resources.filters.allLanguages')}</option>
                    {RESOURCE_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {t(l.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2 text-bb-xs font-medium text-bb-muted">
                    {t('resources.fields.category')}
                  </legend>
                  <div className="space-y-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-bb-inner px-2 py-1.5 text-bb-sm hover:bg-bb-alt">
                      <input
                        type="radio"
                        name="resource-category"
                        checked={categoryId === ''}
                        onChange={() => setCategoryId('')}
                      />
                      <span>{t('resources.filters.allCategories')}</span>
                    </label>
                    {categories.map((c) => (
                      <label
                        key={c.id}
                        className={clsx(
                          'flex cursor-pointer items-center justify-between gap-2 rounded-bb-inner px-2 py-1.5 text-bb-sm hover:bg-bb-alt',
                          categoryId === c.id && 'bg-bb-alt',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="radio"
                            name="resource-category"
                            checked={categoryId === c.id}
                            onChange={() => setCategoryId(c.id)}
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="shrink-0 text-bb-xs text-bb-muted">{c.resourceCount}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {activeFilterCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSearch('')
                      setCategoryId('')
                      setLanguage('')
                    }}
                  >
                    {t('resources.filters.reset')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {(error || actionError) && (
            <p className="mb-3 text-bb-sm text-bb-danger">
              {(error || actionError).message || t('resources.loadFailed')}
            </p>
          )}

          {loading ? (
            <p className="m-0 text-bb-sm text-bb-muted">{t('common.loading')}</p>
          ) : resources.length === 0 ? (
            <p className="m-0 text-bb-sm text-bb-muted">{t('resources.empty')}</p>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <section key={group.id}>
                  <h2 className="m-0 mb-3 text-bb-base font-semibold text-bb-heading">{group.name}</h2>
                  <div className="space-y-4">
                    {group.items.map((resource) => (
                      <ResourceDocumentCard
                        key={resource.id}
                        resource={resource}
                        meta={languageLabel(t, resource.language)}
                        showOpen
                        showDelete={isAdmin}
                        deleting={busyId === resource.id}
                        onDelete={() => setDeleteTarget(resource)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('resources.deleteConfirmTitle')}
        body={t('resources.deleteConfirmBody', { title: deleteTarget?.title || '' })}
        confirmLabel={t('resources.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setBusyId(deleteTarget.id)
          try {
            await remove(deleteTarget.id)
            await reloadCategories()
            setDeleteTarget(null)
          } catch {
            /* actionError déjà posé */
          } finally {
            setBusyId(null)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(categoryDeleteTarget)}
        title={t('resources.categoryDeleteConfirmTitle')}
        body={t('resources.categoryDeleteConfirmBody', {
          name: categoryDeleteTarget?.name || '',
          count: categoryDeleteTarget?.resourceCount || 0,
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setCategoryDeleteTarget(null)}
        onConfirm={async () => {
          if (!categoryDeleteTarget) return
          setCategoryBusy(true)
          setCategoryFormError(null)
          try {
            await removeCategory(categoryDeleteTarget.id)
            if (categoryId === categoryDeleteTarget.id) setCategoryId('')
            if (newCategoryId === categoryDeleteTarget.id) {
              setNewCategoryId(categories.find((c) => c.id !== categoryDeleteTarget.id)?.id || '')
            }
            setCategoryDeleteTarget(null)
          } catch (err) {
            setCategoryFormError(err.message || t('resources.categoryDeleteFailed'))
            setCategoryDeleteTarget(null)
          } finally {
            setCategoryBusy(false)
          }
        }}
      />
    </div>
  )
}
