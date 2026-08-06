import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { changePassword, deleteMyAccount } from '../../api/users'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'

const SETTINGS_TABS = [
  { id: 'general', labelKey: 'members.settingsTabs.general' },
  { id: 'profile', labelKey: 'members.settingsTabs.privacy' },
  { id: 'notifications', labelKey: 'members.settingsTabs.email' },
  { id: 'danger', labelKey: 'members.settingsTabs.danger' },
]

/** Référence: members/single/settings.php — branché App API (mdp + désactivation) */
export function ProfileSettings({ member }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('general')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSuccess, setPasswordSuccess] = useState(null)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [privacy, setPrivacy] = useState({
    whoCanSee: 'everyone',
    whoCanMessage: 'friends',
  })
  const [emailPrefs, setEmailPrefs] = useState({
    activity: true,
    messages: true,
    friends: true,
  })
  const [prefsSaved, setPrefsSaved] = useState(false)

  const savePrefs = (e) => {
    e.preventDefault()
    setPrefsSaved(true)
    setTimeout(() => setPrefsSaved(false), 2000)
  }

  const onChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.passwordMismatch'))
      return
    }
    if (newPassword.length < 10) {
      setPasswordError(t('auth.passwordHint'))
      return
    }

    setPasswordBusy(true)
    try {
      const data = await changePassword(currentPassword, newPassword)
      setPasswordSuccess(data?.message || t('members.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      // Sessions révoquées côté API → reconnexion obligatoire
      setTimeout(() => {
        logout({ redirect: false }).then(() => {
          navigate('/login', { replace: true, state: { reason: 'password_changed' } })
        })
      }, 1200)
    } catch (err) {
      setPasswordError(err.message || t('members.passwordChangeFailed'))
    } finally {
      setPasswordBusy(false)
    }
  }

  const onDeleteAccount = async (e) => {
    e.preventDefault()
    setDeleteError(null)
    if (!deleteConfirm) {
      setDeleteError(t('members.deleteConfirmRequired'))
      return
    }
    if (!deletePassword) {
      setDeleteError(t('members.deletePasswordRequired'))
      return
    }

    setDeleteBusy(true)
    try {
      await deleteMyAccount(deletePassword)
      await logout({ redirect: false })
      navigate('/login', { replace: true, state: { reason: 'account_deactivated' } })
    } catch (err) {
      setDeleteError(err.message || t('members.deleteFailed'))
      setDeleteBusy(false)
    }
  }

  return (
    <div className="bp-settings-container">
      <header className="settings-header mb-4 flex flex-wrap items-center gap-3">
        <h1 className="entry-title settings-title m-0 text-bb-lg font-semibold text-bb-heading">
          {t('members.settings')}
        </h1>
        <Link
          to={`/members/${member.id}/profile`}
          className="push-right ml-auto rounded-bb-btn border border-bb-border px-3 py-1.5 text-bb-sm text-bb-heading hover:border-bb-primary hover:text-bb-primary"
        >
          {t('members.viewProfile')}
        </Link>
      </header>

      <nav id="subnav" className="mb-4" aria-label="Settings sub menu">
        <ul className="subnav bb-scroll-tabs m-0 list-none gap-1 p-0">
          {SETTINGS_TABS.map((item) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-bb-inner px-3 py-2 text-bb-sm font-medium ${
                  tab === item.id ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text'
                }`}
              >
                {t(item.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bb-bp-settings-content bb-card p-5">
        {prefsSaved && (
          <div className="mb-4 rounded-bb-inner bg-[rgba(var(--bb-primary-color-rgb),0.1)] px-3 py-2 text-bb-sm text-bb-primary">
            {t('members.settingsSaved')}
          </div>
        )}

        {tab === 'general' && (
          <form className="space-y-4" onSubmit={onChangePassword}>
            <p className="m-0 text-bb-sm text-bb-muted">{t('members.passwordChangeHint')}</p>
            <Field label={t('members.currentPassword')}>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="field-input"
              />
            </Field>
            <Field label={t('auth.newPassword')}>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
                className="field-input"
              />
              <span className="mt-1 block text-bb-xs text-bb-muted">{t('auth.passwordHint')}</span>
            </Field>
            <Field label={t('auth.confirmPassword')}>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="field-input"
              />
            </Field>
            {passwordError && (
              <p className="m-0 text-bb-sm text-bb-danger" role="alert">
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p className="m-0 text-bb-sm text-bb-success" role="status">
                {passwordSuccess}
              </p>
            )}
            <Button type="submit" size="sm" disabled={passwordBusy}>
              {passwordBusy ? t('members.saving') : t('members.changePassword')}
            </Button>
          </form>
        )}

        {tab === 'profile' && (
          <form className="space-y-4" onSubmit={savePrefs}>
            <Field label={t('members.privacy.whoCanSee')}>
              <select
                value={privacy.whoCanSee}
                onChange={(e) => setPrivacy((p) => ({ ...p, whoCanSee: e.target.value }))}
                className="field-input"
              >
                <option value="everyone">{t('members.privacy.everyone')}</option>
                <option value="members">{t('members.privacy.members')}</option>
                <option value="friends">{t('members.privacy.friends')}</option>
              </select>
            </Field>
            <Field label={t('members.privacy.whoCanMessage')}>
              <select
                value={privacy.whoCanMessage}
                onChange={(e) => setPrivacy((p) => ({ ...p, whoCanMessage: e.target.value }))}
                className="field-input"
              >
                <option value="everyone">{t('members.privacy.everyone')}</option>
                <option value="friends">{t('members.privacy.friends')}</option>
                <option value="nobody">{t('members.privacy.nobody')}</option>
              </select>
            </Field>
            <Button type="submit" size="sm">
              {t('members.saveChanges')}
            </Button>
          </form>
        )}

        {tab === 'notifications' && (
          <form className="space-y-3" onSubmit={savePrefs}>
            {Object.entries(emailPrefs).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-bb-sm text-bb-heading">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setEmailPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                />
                {t(`members.emailPrefs.${key}`)}
              </label>
            ))}
            <Button type="submit" size="sm" className="mt-2">
              {t('members.saveChanges')}
            </Button>
          </form>
        )}

        {tab === 'danger' && (
          <form className="space-y-4" onSubmit={onDeleteAccount}>
            <div className="rounded-bb-inner border border-red-200 bg-red-50 px-3 py-3">
              <h2 className="m-0 mb-1 text-bb-base font-semibold text-red-800">
                {t('members.deleteAccountTitle')}
              </h2>
              <p className="m-0 text-bb-sm text-red-700">{t('members.deleteAccountHint')}</p>
            </div>
            <Field label={t('auth.password')}>
              <input
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                className="field-input"
              />
            </Field>
            <label className="flex items-start gap-2 text-bb-sm text-bb-heading">
              <input
                type="checkbox"
                className="mt-1"
                checked={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.checked)}
              />
              <span>{t('members.deleteAccountConfirm')}</span>
            </label>
            {deleteError && (
              <p className="m-0 text-bb-sm text-bb-danger" role="alert">
                {deleteError}
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={deleteBusy}
              className="!border-red-600 !bg-red-600 !text-white hover:!border-red-700 hover:!bg-red-700"
            >
              {deleteBusy ? t('members.deleting') : t('members.deleteAccount')}
            </Button>
          </form>
        )}
      </div>

      <style>{`
        .field-input {
          width: 100%;
          height: 2.5rem;
          border-radius: var(--bb-input-radius);
          border: 1px solid var(--bb-content-border-color);
          background: var(--bb-content-background-color);
          padding: 0 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .field-input:focus { border-color: var(--bb-primary-color); }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-bb-sm font-medium text-bb-heading">{label}</span>
      {children}
    </label>
  )
}
