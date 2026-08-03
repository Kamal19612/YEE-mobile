import { useState } from 'react'
import { Button } from '../../components/ui/Button'

/** Référence: bbpress/form-topic.php */
export function TopicForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit?.({ title: title.trim(), content: content.trim() })
      setTitle('')
      setContent('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="bb-card mb-5 space-y-3 p-4" onSubmit={submit}>
      <h2 className="m-0 text-bb-md font-semibold text-bb-heading">Create New Discussion</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Discussion title"
        className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What would you like to discuss?"
        rows={5}
        className="w-full resize-y rounded-bb-input border border-bb-border px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
        required
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !title.trim() || !content.trim()}>
          {busy ? 'Publishing…' : 'Publish'}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
