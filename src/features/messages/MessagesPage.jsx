import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { IconAngleLeft } from '../../components/icons'
import { useMessages } from '../../hooks/useMessages'
import { useAuth } from '../../hooks/useAuth'
import { formatTimeSince } from '../activity/utils'

const DESKTOP_MQ = '(min-width: 800px)'

/** Page messagerie — patterns de messages-dropdown.php étendus */
export function MessagesPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest' }
  const { threads, activeThread, loading, error, sendMessage, createThread } = useMessages(threadId)
  const [draft, setDraft] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeName, setComposeName] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!threadId && threads.length && !loading && window.matchMedia(DESKTOP_MQ).matches) {
      navigate(`/messages/${threads[0].id}`, { replace: true })
    }
  }, [threadId, threads, loading, navigate])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeThread?.messages?.length])

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeThread) return
    await sendMessage(activeThread.id, draft.trim())
    setDraft('')
  }

  const showThread = Boolean(threadId)

  return (
    <div className="my-messages flex h-[calc(100dvh-var(--bb-header-height)-2.5rem)] w-full min-h-[360px] overflow-hidden rounded-bb border border-bb-border bg-bb-content bb:min-h-[480px]">
      <aside
        className={clsx(
          'flex w-full flex-col border-r border-bb-border bb:w-[320px] bb:shrink-0',
          showThread && 'hidden bb:flex',
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-bb-border px-4 py-3">
          <div>
            <h1 className="m-0 text-bb-md font-semibold text-bb-heading">Messages</h1>
            <span className="text-bb-xs text-bb-muted">
              {threads.filter((t) => t.unread).length} non lus
            </span>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => setComposeOpen(true)}>
            Nouveau
          </Button>
        </header>
        {composeOpen && (
          <form
            className="space-y-2 border-b border-bb-border bg-bb-alt p-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!composeName.trim()) return
              const thread = await createThread({
                participantName: composeName.trim(),
                firstMessage: composeBody.trim() || 'Bonjour !',
              })
              setComposeOpen(false)
              setComposeName('')
              setComposeBody('')
              navigate(`/messages/${thread.id}`)
            }}
          >
            <input
              value={composeName}
              onChange={(e) => setComposeName(e.target.value)}
              placeholder="Nom du destinataire"
              className="h-9 w-full rounded-bb-input border border-bb-border bg-bb-content px-3 text-bb-sm outline-none focus:border-bb-primary"
              required
            />
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Premier message (optionnel)"
              rows={2}
              className="w-full rounded-bb-input border border-bb-border bg-bb-content px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Créer
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setComposeOpen(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}
        <ul className="m-0 flex-1 list-none overflow-y-auto p-0">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="mx-3 my-2 h-16 animate-pulse rounded-bb-inner bg-bb-alt" />
            ))}
          {!loading &&
            threads.map((thread) => {
              const title = thread.isGroup
                ? thread.subject
                : thread.participants.map((p) => p.displayName).join(', ')
              const last = thread.messages[thread.messages.length - 1]
              const active = String(thread.id) === String(threadId)
              return (
                <li key={thread.id}>
                  <Link
                    to={`/messages/${thread.id}`}
                    className={clsx(
                      'flex items-start gap-3 border-b border-bb-border px-4 py-3 hover:bg-bb-alt',
                      active && 'bg-[rgba(var(--bb-primary-color-rgb),0.06)]',
                      thread.unread && 'font-medium',
                    )}
                  >
                    <Avatar name={title} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-bb-sm text-bb-heading">{title}</span>
                        <span className="shrink-0 text-bb-xs text-bb-muted">
                          {formatTimeSince(thread.updatedAt)}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          'truncate text-bb-sm',
                          thread.unread ? 'text-bb-heading' : 'text-bb-muted',
                        )}
                      >
                        {last?.content}
                      </div>
                    </div>
                    {thread.unread && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-bb-primary" />
                    )}
                  </Link>
                </li>
              )
            })}
        </ul>
      </aside>

      <section
        className={clsx(
          'min-w-0 flex-1 flex-col',
          showThread ? 'flex' : 'hidden bb:flex',
        )}
      >
        {!activeThread ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-bb-sm text-bb-muted">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b border-bb-border px-3 py-3 bb:gap-3 bb:px-4">
              <Link
                to="/messages"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-bb-inner text-bb-heading hover:bg-bb-alt bb:hidden"
                aria-label="Back to conversations"
              >
                <IconAngleLeft />
              </Link>
              <Avatar
                name={
                  activeThread.isGroup
                    ? activeThread.subject
                    : activeThread.participants[0]?.displayName
                }
                size="md"
              />
              <div className="min-w-0">
                <div className="truncate font-semibold text-bb-heading">
                  {activeThread.isGroup
                    ? activeThread.subject
                    : activeThread.participants.map((p) => p.displayName).join(', ')}
                </div>
                <div className="text-bb-xs text-bb-muted">
                  {activeThread.participants.length + 1} participants
                </div>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-bb-body px-3 py-4 bb:px-4">
              {activeThread.messages.map((msg) => {
                const mine = msg.senderId === currentUser.id
                return (
                  <div
                    key={msg.id}
                    className={clsx('flex gap-2', mine ? 'justify-end' : 'justify-start')}
                  >
                    {!mine && <Avatar name={msg.senderName} size="sm" />}
                    <div
                      className={clsx(
                        'max-w-[85%] rounded-bb-inner px-3 py-2 text-bb-sm bb:max-w-[75%]',
                        mine
                          ? 'bg-bb-primary text-white'
                          : 'border border-bb-border bg-bb-content text-bb-heading',
                      )}
                    >
                      {!mine && (
                        <div className="mb-0.5 text-bb-xs font-semibold opacity-80">
                          {msg.senderName}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      <div
                        className={clsx(
                          'mt-1 text-[10px]',
                          mine ? 'text-white/70' : 'text-bb-muted',
                        )}
                      >
                        {formatTimeSince(msg.date)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={submit} className="flex gap-2 border-t border-bb-border p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message..."
                className="h-10 min-w-0 flex-1 rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
              />
              <Button type="submit" size="sm" disabled={!draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
