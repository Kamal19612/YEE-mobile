import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'

/** Référence: bbpress/form-reply.php */
export function ReplyForm({ onSubmit, replyToName, disabled }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const currentUser = user || { displayName: 'Guest', avatar: null }
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim() || busy || disabled) return
    setBusy(true)
    try {
      await onSubmit?.({ content: content.trim() })
      setContent('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id={`new-reply`} className="bbp-reply-form bb-card mt-5 p-4">
      <form id="new-post" name="new-post" onSubmit={submit}>
        <fieldset className="bbp-form m-0 border-0 p-0">
          <legend className="mb-3 block text-bb-sm font-semibold text-bb-heading">
            {t('forums.replyTo')} <span id="bbp-reply-to-user">{replyToName}</span>
          </legend>
          <div className="flex gap-3">
            <Avatar name={currentUser.displayName} src={currentUser.avatar} size="md" />
            <div className="min-w-0 flex-1">
              <textarea
                id="bbp_reply_content"
                rows={4}
                value={content}
                disabled={disabled}
                onChange={(e) => setContent(e.target.value)}
                placeholder={disabled ? t('forums.replyClosed') : t('forums.replyPlaceholder')}
                className="mb-3 w-full resize-y rounded-bb-input border border-bb-border px-3 py-2 text-bb-sm outline-none focus:border-bb-primary disabled:bg-bb-alt"
              />
              <Button type="submit" size="sm" disabled={!content.trim() || busy || disabled}>
                {busy ? t('forums.posting') : t('forums.postReply')}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
