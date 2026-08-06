import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'

/** Référence: members/single/invites.php */
export function ProfileInvites() {
  const { t, i18n } = useTranslation()
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const locale = i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-GB'

  const send = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setInvites((prev) => [
      {
        id: Date.now(),
        email: email.trim(),
        status: 'pending',
        sentAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setEmail('')
  }

  return (
    <div className="space-y-4">
      <div className="bb-card p-5">
        <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">{t('members.inviteByEmail')}</h2>
        <form className="flex flex-col gap-2 bb:flex-row" onSubmit={send}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="h-10 flex-1 rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
          />
          <Button type="submit" size="sm">
            {t('members.sendInvite')}
          </Button>
        </form>
      </div>

      <div className="bb-card overflow-hidden">
        <header className="border-b border-bb-border px-4 py-3">
          <h2 className="m-0 text-bb-md font-semibold text-bb-heading">{t('members.sentInvites')}</h2>
        </header>
        <ul className="m-0 list-none divide-y divide-bb-border p-0">
          {invites.length === 0 && (
            <li className="px-4 py-6 text-center text-bb-sm text-bb-muted">{t('members.noInvites')}</li>
          )}
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between gap-3 px-4 py-3 text-bb-sm">
              <div>
                <div className="font-medium text-bb-heading">{invite.email}</div>
                <div className="text-bb-xs text-bb-muted">
                  {t('members.inviteSentOn', {
                    date: new Date(invite.sentAt).toLocaleDateString(locale),
                  })}
                </div>
              </div>
              <span
                className={`rounded-bb-option px-2 py-0.5 text-bb-xs font-medium ${
                  invite.status === 'accepted'
                    ? 'bg-[rgba(20,181,80,0.12)] text-bb-success'
                    : 'bg-bb-label text-bb-label-text'
                }`}
              >
                {t(`members.inviteStatus.${invite.status}`, { defaultValue: invite.status })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
