import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'profile', label: 'Privacy' },
  { id: 'notifications', label: 'Email' },
  { id: 'export', label: 'Export Data' },
]

/** Référence: members/single/settings.php */
export function ProfileSettings({ member }) {
  const [tab, setTab] = useState('general')
  const [email, setEmail] = useState(`${member.mentionName}@example.com`)
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [privacy, setPrivacy] = useState({
    whoCanSee: 'everyone',
    whoCanMessage: 'friends',
  })
  const [emailPrefs, setEmailPrefs] = useState({
    activity: true,
    messages: true,
    friends: true,
  })

  const save = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bp-settings-container">
      <header className="settings-header mb-4 flex flex-wrap items-center gap-3">
        <h1 className="entry-title settings-title m-0 text-bb-lg font-semibold text-bb-heading">
          Account Settings
        </h1>
        <Link
          to={`/members/${member.id}/profile`}
          className="push-right ml-auto rounded-bb-btn border border-bb-border px-3 py-1.5 text-bb-sm text-bb-heading hover:border-bb-primary hover:text-bb-primary"
        >
          View Profile
        </Link>
      </header>

      <nav id="subnav" className="mb-4" aria-label="Settings sub menu">
        <ul className="subnav bb-scroll-tabs m-0 list-none gap-1 p-0">
          {SETTINGS_TABS.map((t) => (
            <li key={t.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-bb-inner px-3 py-2 text-bb-sm font-medium ${
                  tab === t.id ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text'
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bb-bp-settings-content bb-card p-5">
        {saved && (
          <div className="mb-4 rounded-bb-inner bg-[rgba(var(--bb-primary-color-rgb),0.1)] px-3 py-2 text-bb-sm text-bb-primary">
            Settings saved.
          </div>
        )}

        {tab === 'general' && (
          <form className="space-y-4" onSubmit={save}>
            <Field label="Account Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Change Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="field-input"
              />
            </Field>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </form>
        )}

        {tab === 'profile' && (
          <form className="space-y-4" onSubmit={save}>
            <Field label="Who can see your profile?">
              <select
                value={privacy.whoCanSee}
                onChange={(e) => setPrivacy((p) => ({ ...p, whoCanSee: e.target.value }))}
                className="field-input"
              >
                <option value="everyone">Everyone</option>
                <option value="members">Members Only</option>
                <option value="friends">My Friends</option>
              </select>
            </Field>
            <Field label="Who can message you?">
              <select
                value={privacy.whoCanMessage}
                onChange={(e) => setPrivacy((p) => ({ ...p, whoCanMessage: e.target.value }))}
                className="field-input"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">My Friends</option>
                <option value="nobody">No One</option>
              </select>
            </Field>
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </form>
        )}

        {tab === 'notifications' && (
          <form className="space-y-3" onSubmit={save}>
            {Object.entries(emailPrefs).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2 text-bb-sm text-bb-heading">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setEmailPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                />
                Email me about {key}
              </label>
            ))}
            <Button type="submit" size="sm" className="mt-2">
              Save Changes
            </Button>
          </form>
        )}

        {tab === 'export' && (
          <div>
            <p className="m-0 mb-4 text-bb-sm text-bb-text">
              Request an export of your personal data stored in this community.
            </p>
            <Button type="button" size="sm" variant="secondary">
              Request Export
            </Button>
          </div>
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
