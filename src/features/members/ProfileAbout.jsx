import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'

/** Référence: members/single/profile/profile-loop.php */
export function ProfileAbout({ member, isOwn, onSaveField }) {
  const { t } = useTranslation()
  const [editingGroup, setEditingGroup] = useState(null)
  const [draft, setDraft] = useState({})

  const startEdit = (group) => {
    const values = {}
    group.fields.forEach((f) => {
      values[f.id] = f.value
    })
    setDraft(values)
    setEditingGroup(group.id)
  }

  const saveGroup = (group) => {
    group.fields.forEach((f) => {
      if (draft[f.id] !== f.value) onSaveField?.(group.id, f.id, draft[f.id])
    })
    setEditingGroup(null)
  }

  if (!member.xprofile?.length) {
    return (
      <div className="bb-card p-6 text-bb-sm text-bb-muted">{t('members.noProfileFields')}</div>
    )
  }

  return (
    <div className="bp-profile-content space-y-4">
      {member.xprofile.map((group) => (
        <div key={group.id} className="group-separator-block bb-card overflow-hidden">
          <header className="profile-loop-header profile-header flex items-center justify-between border-b border-bb-border px-4 py-3">
            <h2 className="entry-title bb-profile-title m-0 text-bb-md font-semibold text-bb-heading">
              {group.name}
            </h2>
            {isOwn &&
              (editingGroup === group.id ? (
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingGroup(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="button" size="sm" onClick={() => saveGroup(group)}>
                    {t('common.save')}
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(group)}>
                  {t('common.edit')}
                </Button>
              ))}
          </header>

          <div className="bp-widget p-0">
            <table className="profile-fields bp-tables-user w-full border-collapse text-left text-bb-sm">
              <tbody>
                {group.fields.map((field) => (
                  <tr key={field.id} className="border-b border-bb-border last:border-b-0">
                    <td className="label w-1/3 px-4 py-3 font-medium text-bb-heading align-top">
                      {field.name}
                    </td>
                    <td className="data px-4 py-3 text-bb-text">
                      {editingGroup === group.id ? (
                        <input
                          value={draft[field.id] ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, [field.id]: e.target.value }))}
                          className="w-full rounded-bb-input border border-bb-border px-3 py-2 outline-none focus:border-bb-primary"
                        />
                      ) : field.value?.startsWith('http') ? (
                        <a href={field.value} className="text-bb-primary hover:underline" target="_blank" rel="noreferrer">
                          {field.value}
                        </a>
                      ) : (
                        field.value || '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
