import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { IconGlobe, IconImage, IconPoll, IconUsersLock } from '../../components/icons'
import { currentUser } from '../../data/demoData'

/** Référence visuelle: #whats-new-form (BuddyBoss Platform post-form) */
export function ActivityComposer({ onSubmit, user = currentUser }) {
  const [content, setContent] = useState('')
  const [privacy, setPrivacy] = useState('public')
  const [focused, setFocused] = useState(false)
  const [mode, setMode] = useState(null) // 'media' | 'poll' | null
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [mediaPreview, setMediaPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef(null)

  const canPost = content.trim().length > 0 || mediaPreview || (mode === 'poll' && pollQuestion.trim())

  const reset = () => {
    setContent('')
    setMode(null)
    setPollQuestion('')
    setPollOptions(['', ''])
    setMediaPreview(null)
    setFocused(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setMediaPreview({ id: `local-${Date.now()}`, type: 'image', url, alt: file.name })
    setMode('media')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canPost || submitting) return
    setSubmitting(true)
    try {
      const poll =
        mode === 'poll' && pollQuestion.trim()
          ? {
              question: pollQuestion.trim(),
              options: pollOptions
                .filter((o) => o.trim())
                .map((label, i) => ({ id: String.fromCharCode(97 + i), label: label.trim(), votes: 0 })),
              totalVotes: 0,
              votedOptionId: null,
            }
          : null

      await onSubmit?.({
        content: content.trim(),
        privacy,
        media: mediaPreview ? [mediaPreview] : [],
        poll,
      })
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      id="whats-new-form"
      name="whats-new-form"
      onSubmit={handleSubmit}
      className={clsx(
        'mb-5 rounded-bb border border-bb-border bg-bb-content p-4 shadow-card',
        focused && 'focus-in',
      )}
    >
      <div className="flex gap-3">
        <Avatar name={user.displayName} src={user.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <div id="whats-new-textarea" className="mb-3">
            <textarea
              id="whats-new"
              rows={focused || content ? 3 : 1}
              value={content}
              onFocus={() => setFocused(true)}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's new, ${user.displayName.split(' ')[0]}?`}
              className="w-full resize-none rounded-bb-input border border-bb-border bg-bb-content px-3 py-2.5 text-bb-base text-bb-heading outline-none placeholder:text-bb-muted focus:border-bb-primary"
            />
          </div>

          {mediaPreview && (
            <div className="relative mb-3 overflow-hidden rounded-bb-inner">
              <img src={mediaPreview.url} alt={mediaPreview.alt} className="max-h-72 w-full object-cover" />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-bb-xs text-white"
                onClick={() => {
                  setMediaPreview(null)
                  if (mode === 'media') setMode(null)
                }}
              >
                Remove
              </button>
            </div>
          )}

          {mode === 'poll' && (
            <div className="mb-3 space-y-2 rounded-bb-inner border border-bb-border bg-bb-alt p-3">
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full rounded-bb-input border border-bb-border bg-bb-content px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
              />
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions]
                    next[i] = e.target.value
                    setPollOptions(next)
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full rounded-bb-input border border-bb-border bg-bb-content px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
                />
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  className="text-bb-sm font-medium text-bb-primary"
                  onClick={() => setPollOptions((o) => [...o, ''])}
                >
                  + Add option
                </button>
              )}
            </div>
          )}

          <div id="whats-new-toolbar" className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <ToolbarBtn
                label="Photo"
                active={mode === 'media'}
                onClick={() => fileRef.current?.click()}
              >
                <IconImage className="h-5 w-5" />
              </ToolbarBtn>
              <ToolbarBtn
                label="Poll"
                active={mode === 'poll'}
                onClick={() => setMode((m) => (m === 'poll' ? null : 'poll'))}
              >
                <IconPoll className="h-5 w-5" />
              </ToolbarBtn>

              <button
                type="button"
                id="bp-activity-privacy-point"
                className="ml-1 inline-flex items-center gap-1 rounded-bb-inner px-2 py-1.5 text-bb-sm text-bb-muted hover:bg-bb-alt hover:text-bb-heading"
                onClick={() => setPrivacy((p) => (p === 'public' ? 'loggedin' : 'public'))}
                title="Privacy"
              >
                {privacy === 'public' ? <IconGlobe className="h-4 w-4" /> : <IconUsersLock className="h-4 w-4" />}
                <span>{privacy === 'public' ? 'Public' : 'Members'}</span>
              </button>
            </div>

            <Button type="submit" size="sm" disabled={!canPost || submitting}>
              {submitting ? 'Posting…' : 'Post Update'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function ToolbarBtn({ children, label, active, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 w-9 items-center justify-center rounded-bb-inner transition-colors',
        active ? 'bg-[rgba(var(--bb-primary-color-rgb),0.12)] text-bb-primary' : 'text-bb-muted hover:bg-bb-alt hover:text-bb-heading',
      )}
    >
      {children}
    </button>
  )
}
