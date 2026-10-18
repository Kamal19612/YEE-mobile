import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import {
  FEED_AUDIO_ACCEPT,
  FEED_IMAGE_ACCEPT,
  validateFeedMedia,
} from '../../api/feed'
import { searchConversations } from '../../api/messages'
import { ChatMedia, ChatMediaDownload } from './ChatMedia'
import { ChatVoicePlayer } from './ChatVoicePlayer'
import './messages.css'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { UserPicker } from '../../components/ui/UserPicker'
import {
  IconAngleLeft,
  IconClose,
  IconEllipsis,
  IconGroup,
  IconMic,
  IconPaperclip,
  IconSearch,
} from '../../components/icons'
import { useMessages } from '../../hooks/useMessages'
import { useAuth } from '../../hooks/useAuth'
import { formatRecordingTime, useAudioRecorder } from '../../hooks/useAudioRecorder'
import { compressImagesForUpload } from '../../utils/compressImage'
import { ensurePlayableAudioFiles } from '../../utils/ensurePlayableAudio'
import { formatTimeSince } from '../activity/utils'

const DESKTOP_MQ = '(min-width: 800px)'
const NEAR_BOTTOM_PX = 120

function isImageFile(file) {
  return file?.type?.startsWith('image/')
}

function isAudioFile(file) {
  return file?.type?.startsWith('audio/')
}

function threadTitle(thread) {
  if (!thread) return ''
  if (thread.isGroup) return thread.subject || thread.groupName || ''
  return thread.participants.map((p) => p.displayName).join(', ') || thread.subject
}

function lastExcerpt(thread, emptyLabel, deletedLabel) {
  const last = thread.lastMessage
  if (!last) return ''
  if (last.deleted) return deletedLabel || ''
  if (last.content) return last.content.replace(/<[^>]+>/g, '')
  if (last.media?.length) return emptyLabel
  return ''
}

function dayKeyFromDate(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayKey(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return dayKeyFromDate(d)
}

function formatDayLabel(iso, t, locale) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const key = dayKeyFromDate(d)
  if (key === dayKeyFromDate(today)) return t('messages.today')
  if (key === dayKeyFromDate(yesterday)) return t('messages.yesterday')
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatClock(iso, locale) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function sameSenderCluster(prev, curr) {
  if (!prev || !curr) return false
  if (dayKey(prev.date) !== dayKey(curr.date)) return false
  return String(prev.senderId) === String(curr.senderId)
}

function isAudioOnlyMessage(msg) {
  if (!msg?.media?.length || msg.content) return false
  return msg.media.every((m) => m.mediaType === 'audio')
}

function isImageOnlyMessage(msg) {
  if (!msg?.media?.length || msg.content) return false
  return msg.media.every((m) => m.mediaType === 'image')
}

function receiptMark(msg, isGroup) {
  if (!msg) return ''
  if (msg.seen) {
    return isGroup && msg.seenCount > 1 ? `✓✓${msg.seenCount}` : '✓✓'
  }
  return '✓'
}

/** Page messagerie — liste + fil + compose (API Spring). */
export function MessagesPage() {
  const { t, i18n } = useTranslation()
  const { threadId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUser = user || { id: 0, displayName: 'Guest' }
  const {
    threads,
    activeThread,
    messages,
    loading,
    loadingMessages,
    error,
    sendMessage,
    deleteMessage,
    createThread,
    deleteThread,
    loadOlder,
    hasOlder,
    typingUserId,
    notifyTyping,
  } = useMessages(threadId)
  const { supported: micSupported, recording, elapsedMs, start, stop, cancel } =
    useAudioRecorder()
  const [draft, setDraft] = useState('')
  const [files, setFiles] = useState([])
  const [fileUrls, setFileUrls] = useState([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeUser, setComposeUser] = useState(null)
  const [composeBody, setComposeBody] = useState('')
  const [composeError, setComposeError] = useState(null)
  const [sendError, setSendError] = useState(null)
  const [sending, setSending] = useState(false)
  /** idle | preparing | recording | sending — flux note vocale. */
  const [voicePhase, setVoicePhase] = useState('idle')
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [threadMenuOpen, setThreadMenuOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingThread, setDeletingThread] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [deletingMessage, setDeletingMessage] = useState(false)
  const [msgMenuId, setMsgMenuId] = useState(null)
  const longPressTimerRef = useRef(null)
  const [query, setQuery] = useState('')
  const [searchHits, setSearchHits] = useState(null)
  const scrollerRef = useRef(null)
  const bottomRef = useRef(null)
  const composeFormRef = useRef(null)
  const fileRef = useRef(null)
  const draftRef = useRef(null)
  const stickToBottomRef = useRef(true)
  const pendingScrollRestoreRef = useRef(null)
  const prevThreadIdRef = useRef(threadId)

  const unreadCount = threads.filter((th) => th.unread).length
  const hasImages = files.some(isImageFile)
  const voiceBusy = voicePhase !== 'idle'
  const canSend =
    !sending &&
    !recording &&
    !voiceBusy &&
    (draft.trim().length > 0 || files.length > 0)

  const typingName = useMemo(() => {
    if (!typingUserId || !activeThread) return null
    const peer = activeThread.participants?.find(
      (p) => String(p.id) === String(typingUserId),
    )
    return peer?.displayName || null
  }, [typingUserId, activeThread])

  // Object URLs pour aperçus d’attachments locaux.
  useEffect(() => {
    const urls = files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
      image: isImageFile(f),
      audio: isAudioFile(f),
    }))
    setFileUrls(urls)
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u.url))
    }
  }, [files])

  useEffect(() => {
    if (!threadId && threads.length && !loading && window.matchMedia(DESKTOP_MQ).matches) {
      navigate(`/messages/${threads[0].id}`, { replace: true })
    }
  }, [threadId, threads, loading, navigate])

  // Reset compose local quand on change de fil.
  useEffect(() => {
    if (prevThreadIdRef.current !== threadId) {
      prevThreadIdRef.current = threadId
      setDraft('')
      setFiles([])
      setSendError(null)
      setVoicePhase('idle')
      setThreadMenuOpen(false)
      setDeleteConfirmOpen(false)
      stickToBottomRef.current = true
      if (recording) cancel()
    }
  }, [threadId, recording, cancel])

  // Sync phase UI avec l’état MediaRecorder (ex. timeout max 5 min).
  useEffect(() => {
    if (recording && voicePhase === 'preparing') setVoicePhase('recording')
    if (!recording && voicePhase === 'recording') {
      /* stop en cours / annulé — la phase est gérée par les handlers */
    }
  }, [recording, voicePhase])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchHits(null)
      return undefined
    }
    const handle = setTimeout(() => {
      searchConversations(q)
        .then(setSearchHits)
        .catch(() => setSearchHits({ conversations: [], messages: [] }))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (!threadId && recording) cancel()
  }, [threadId, recording, cancel])

  const resizeDraft = useCallback(() => {
    const el = draftRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [])

  useLayoutEffect(() => {
    resizeDraft()
  }, [draft, resizeDraft])

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const scroller = scrollerRef.current
    if (!scroller) {
      bottomRef.current?.scrollIntoView({ behavior })
      return
    }
    if (behavior === 'auto') {
      scroller.scrollTop = scroller.scrollHeight
      return
    }
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  // Ancrage après « messages plus anciens ».
  useLayoutEffect(() => {
    const restore = pendingScrollRestoreRef.current
    const scroller = scrollerRef.current
    if (!restore || !scroller) return
    scroller.scrollTop = scroller.scrollHeight - restore.prevHeight + restore.prevTop
    pendingScrollRestoreRef.current = null
  }, [messages])

  // Auto-scroll uniquement si l’utilisateur est déjà en bas (ou nouveau fil).
  useEffect(() => {
    if (loadingMessages) return
    if (!stickToBottomRef.current) return
    scrollToBottom(messages.length <= 30 ? 'auto' : 'smooth')
  }, [messages.length, typingUserId, loadingMessages, scrollToBottom])

  // Clavier mobile : recentrer le fil quand visualViewport change.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined
    const onVv = () => {
      if (!stickToBottomRef.current) return
      scrollToBottom('auto')
    }
    window.visualViewport.addEventListener('resize', onVv)
    window.visualViewport.addEventListener('scroll', onVv)
    return () => {
      window.visualViewport.removeEventListener('resize', onVv)
      window.visualViewport.removeEventListener('scroll', onVv)
    }
  }, [scrollToBottom])

  const onScrollerScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance < NEAR_BOTTOM_PX
  }

  const goBackToList = () => {
    navigate('/messages', { replace: true })
  }

  const onComposeFocus = () => {
    stickToBottomRef.current = true
    const stick = () => {
      scrollToBottom('auto')
      // Assure que la barre compose reste dans la zone visible (surtout iOS).
      composeFormRef.current?.scrollIntoView({ block: 'end', behavior: 'instant' })
    }
    requestAnimationFrame(stick)
    setTimeout(stick, 120)
    setTimeout(stick, 320)
  }

  const applyFiles = async (next) => {
    const list = Array.isArray(next) ? next.filter(Boolean) : []
    const compressed = await compressImagesForUpload(list)
    const playable = await ensurePlayableAudioFiles(compressed)
    const err = validateFeedMedia(playable)
    if (err) {
      setSendError(err)
      return
    }
    setSendError(null)
    setFiles(playable)
  }

  const openFilePicker = () => {
    if (sending || recording || voiceBusy) return
    fileRef.current?.click()
  }

  const handleMicClick = async () => {
    if (sending || hasImages || voicePhase === 'preparing' || voicePhase === 'sending') return

    // Arrêt = conversion + envoi auto (pas de 2e tap Envoyer).
    if (recording || voicePhase === 'recording') {
      setVoicePhase('sending')
      setSendError(null)
      try {
        const file = await stop()
        if (!file) {
          setVoicePhase('idle')
          setSendError(t('messages.micUnsupported'))
          return
        }
        const [playable] = await ensurePlayableAudioFiles([file])
        const mediaError = validateFeedMedia(playable ? [playable] : [])
        if (mediaError || !playable) {
          setVoicePhase('idle')
          setSendError(mediaError || t('messages.sendFailed'))
          return
        }
        if (!activeThread) {
          setVoicePhase('idle')
          return
        }
        stickToBottomRef.current = true
        await sendMessage(activeThread.id, '', [playable])
        setDraft('')
        setFiles([])
        setVoicePhase('idle')
      } catch (err) {
        setVoicePhase('idle')
        setSendError(err.message || t('messages.sendFailed'))
      }
      return
    }

    if (!micSupported) {
      setSendError(t('messages.micUnsupported'))
      return
    }

    setSendError(null)
    setFiles([])
    setVoicePhase('preparing')
    try {
      await start()
      setVoicePhase('recording')
    } catch (err) {
      setVoicePhase('idle')
      const denied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message === 'Permission denied'
      setSendError(denied ? t('messages.micDenied') : t('messages.micUnsupported'))
    }
  }

  const handleCancelRecording = () => {
    cancel()
    setVoicePhase('idle')
    setSendError(null)
  }

  const removeFileAt = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!activeThread || !canSend) return
    if (!draft.trim() && files.length === 0) return
    const mediaError = validateFeedMedia(files)
    if (mediaError) {
      setSendError(mediaError)
      return
    }
    setSending(true)
    setSendError(null)
    stickToBottomRef.current = true
    try {
      await sendMessage(activeThread.id, draft.trim(), files)
      setDraft('')
      setFiles([])
    } catch (err) {
      setSendError(err.message || t('messages.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  const handleLoadOlder = async () => {
    const scroller = scrollerRef.current
    if (!scroller || loadingOlder) return
    pendingScrollRestoreRef.current = {
      prevHeight: scroller.scrollHeight,
      prevTop: scroller.scrollTop,
    }
    setLoadingOlder(true)
    try {
      await loadOlder()
    } finally {
      setLoadingOlder(false)
    }
  }

  const onDraftKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submit()
    }
  }

  const showThread = Boolean(threadId)
  const visibleThreads = searchHits?.conversations?.length ? searchHits.conversations : threads
  const recordLabel =
    voicePhase === 'preparing'
      ? t('messages.preparingMic')
      : voicePhase === 'sending'
        ? t('messages.sendingAudio')
        : recording || voicePhase === 'recording'
          ? t('messages.stopAndSend')
          : t('messages.recordAudio')
  const attachmentLabel = t('messages.attachment')

  const confirmDeleteThread = async () => {
    if (!activeThread?.id || deletingThread) return
    setDeletingThread(true)
    try {
      await deleteThread(activeThread.id)
      setDeleteConfirmOpen(false)
      setThreadMenuOpen(false)
      navigate('/messages', { replace: true })
    } catch (err) {
      setSendError(err.message || t('messages.deleteFailed'))
      setDeleteConfirmOpen(false)
    } finally {
      setDeletingThread(false)
    }
  }

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const openMsgMenu = (msgId) => {
    clearLongPress()
    setMsgMenuId(String(msgId))
  }

  const startLongPress = (msgId) => {
    clearLongPress()
    longPressTimerRef.current = setTimeout(() => openMsgMenu(msgId), 450)
  }

  const confirmDeleteMessage = async () => {
    if (!activeThread?.id || !messageToDelete || deletingMessage) return
    setDeletingMessage(true)
    try {
      await deleteMessage(activeThread.id, messageToDelete)
      setMessageToDelete(null)
      setMsgMenuId(null)
    } catch (err) {
      setSendError(err.message || t('messages.deleteMessageFailed'))
      setMessageToDelete(null)
    } finally {
      setDeletingMessage(false)
    }
  }

  return (
    <div className="my-messages flex min-h-0 w-full flex-1 overflow-hidden rounded-none border-0 border-bb-border bg-bb-content bb:min-h-[480px] bb:rounded-bb bb:border">
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('messages.deleteThreadTitle')}
        body={t('messages.deleteThreadBody')}
        confirmLabel={t('messages.deleteThread')}
        confirming={deletingThread}
        onCancel={() => !deletingThread && setDeleteConfirmOpen(false)}
        onConfirm={() => void confirmDeleteThread()}
      />
      <ConfirmDialog
        open={Boolean(messageToDelete)}
        title={t('messages.deleteMessageTitle')}
        body={t('messages.deleteMessageBody')}
        confirmLabel={t('messages.deleteMessage')}
        confirming={deletingMessage}
        onCancel={() => !deletingMessage && setMessageToDelete(null)}
        onConfirm={() => void confirmDeleteMessage()}
      />
      <aside
        className={clsx(
          'flex w-full flex-col border-r border-bb-border bb:w-[340px] bb:shrink-0',
          showThread && 'hidden bb:flex',
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b border-bb-border px-4 py-3">
          <div className="min-w-0">
            <h1 className="m-0 text-bb-md font-semibold text-bb-heading">{t('messages.title')}</h1>
            <span className="text-bb-xs text-bb-muted">
              {t(unreadCount === 1 ? 'messages.unread_one' : 'messages.unread_other', {
                count: unreadCount,
              })}
            </span>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => setComposeOpen(true)}>
            {t('messages.new')}
          </Button>
        </header>

        <div className="border-b border-bb-border px-3 py-2">
          <label className="flex items-center gap-2 rounded-bb-input border border-bb-border bg-bb-alt/60 px-2 focus-within:border-bb-primary focus-within:bg-bb-content">
            <IconSearch className="h-4 w-4 shrink-0 text-bb-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('messages.searchPlaceholder')}
              className="my-messages__search-input h-10 w-full border-0 bg-transparent outline-none"
            />
            {query ? (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-bb-inner text-bb-muted hover:bg-bb-alt hover:text-bb-heading"
                onClick={() => setQuery('')}
                aria-label={t('common.cancel')}
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>
        </div>

        {composeOpen && (
          <form
            className="space-y-2 border-b border-bb-border bg-bb-alt p-3"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!composeUser?.id) return
              setComposeError(null)
              try {
                const thread = await createThread({
                  recipientId: composeUser.id,
                  firstMessage: composeBody.trim() || undefined,
                })
                setComposeOpen(false)
                setComposeUser(null)
                setComposeBody('')
                if (thread?.id) navigate(`/messages/${thread.id}`)
              } catch (err) {
                setComposeError(err.message || t('messages.cannotMessage'))
              }
            }}
          >
            <UserPicker
              value={composeUser}
              onChange={setComposeUser}
              placeholder={t('messages.recipientPlaceholder')}
            />
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder={t('messages.firstMessagePlaceholder')}
              rows={2}
              className="w-full resize-none rounded-bb-input border border-bb-border bg-bb-content px-3 py-2 text-bb-sm outline-none focus:border-bb-primary"
            />
            {composeError && (
              <p className="m-0 text-bb-xs text-bb-danger" role="alert">
                {composeError}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={!composeUser?.id}>
                {t('common.create')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setComposeOpen(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}

        {error && (
          <p className="m-0 border-b border-bb-border px-4 py-2 text-bb-xs text-bb-danger" role="alert">
            {error}
          </p>
        )}

        <ul className="m-0 flex-1 list-none overflow-y-auto overscroll-contain p-0">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="mx-3 my-2 h-14 animate-pulse rounded-bb-inner bg-bb-alt" />
            ))}
          {!loading && !visibleThreads.length && (
            <li className="list-none px-6 py-10 text-center">
              <p className="m-0 text-bb-sm font-medium text-bb-heading">{t('messages.empty')}</p>
              <p className="mt-1 text-bb-xs text-bb-muted">{t('messages.emptyHint')}</p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={() => setComposeOpen(true)}
              >
                {t('messages.new')}
              </Button>
            </li>
          )}
          {!loading &&
            visibleThreads.map((thread) => {
              const title = threadTitle(thread)
              const active = String(thread.id) === String(threadId)
              return (
                <li key={thread.id}>
                  <Link
                    to={`/messages/${thread.id}`}
                    className={clsx(
                      'flex items-start gap-3 border-b border-bb-border/70 px-4 py-3 transition-colors hover:bg-bb-alt',
                      active && 'bg-[rgba(var(--bb-primary-color-rgb),0.07)]',
                      thread.unread && 'font-medium',
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar name={title} src={thread.participants[0]?.avatar} size="md" />
                      {thread.isGroup ? (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bb-content text-bb-primary ring-1 ring-bb-border">
                          <IconGroup className="h-2.5 w-2.5" />
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-bb-sm text-bb-heading">{title}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-bb-muted">
                          {formatTimeSince(thread.updatedAt)}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          'mt-0.5 truncate text-bb-sm',
                          thread.unread ? 'text-bb-heading' : 'text-bb-muted',
                        )}
                      >
                        {lastExcerpt(thread, attachmentLabel, t('messages.messageDeleted'))}
                      </div>
                    </div>
                    {thread.unread && (
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-bb-primary"
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          {searchHits?.messages?.length > 0 && (
            <li className="list-none border-t border-bb-border px-4 py-2 text-bb-xs font-semibold text-bb-muted">
              {t('messages.searchMessages')}
            </li>
          )}
          {searchHits?.messages?.map((hit) =>
            hit.message ? (
              <li key={`${hit.conversationId}-${hit.message.id}`}>
                <Link
                  to={`/messages/${hit.conversationId}`}
                  className="block border-b border-bb-border/70 px-4 py-3 hover:bg-bb-alt"
                >
                  <div className="truncate text-bb-sm font-medium text-bb-heading">
                    {hit.conversationSubject}
                  </div>
                  <div className="truncate text-bb-xs text-bb-muted">
                    {hit.message.content?.replace(/<[^>]+>/g, '')}
                  </div>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      </aside>

      <section className={clsx('min-w-0 flex-1 flex-col', showThread ? 'flex' : 'hidden bb:flex')}>
        {!activeThread ? (
          loading || (threadId && loadingMessages) ? (
            <div className="flex flex-1 flex-col gap-3 px-4 py-6" aria-busy="true">
              <div className="h-12 animate-pulse rounded-bb-inner bg-bb-alt" />
              <div className="ml-auto h-12 w-2/3 animate-pulse rounded-bb-inner bg-bb-alt" />
              <div className="h-12 w-1/2 animate-pulse rounded-bb-inner bg-bb-alt" />
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(var(--bb-primary-color-rgb),0.1)] text-bb-primary"
                aria-hidden
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8A2.5 2.5 0 0 1 17.5 17H9l-4 3v-3.5A2.5 2.5 0 0 1 4 14.5v-8Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="m-0 text-bb-sm font-medium text-bb-heading">{t('messages.selectThread')}</p>
              <p className="m-0 max-w-xs text-bb-xs text-bb-muted">{t('messages.selectThreadHint')}</p>
            </div>
          )
        ) : (
          <>
            <header className="my-messages__header flex items-center gap-1.5 px-1.5 py-2 bb:gap-3 bb:px-4">
              <button
                type="button"
                onClick={goBackToList}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bb-heading touch-manipulation hover:bg-white/70 bb:hidden"
                aria-label={t('messages.backToList')}
              >
                <IconAngleLeft />
              </button>
              <Avatar
                name={threadTitle(activeThread)}
                src={activeThread.participants[0]?.avatar}
                size="md"
              />
              <div className="min-w-0 flex-1 px-1">
                <div className="truncate text-bb-sm font-semibold text-bb-heading">
                  {threadTitle(activeThread)}
                </div>
                <div className="truncate text-[11px] text-bb-muted">
                  {typingUserId ? (
                    <span className="text-bb-primary">
                      {typingName
                        ? t('messages.typingNamed', { name: typingName })
                        : t('messages.typing')}
                    </span>
                  ) : activeThread.isGroup && activeThread.groupId ? (
                    <Link
                      to={`/groups/${activeThread.groupId}`}
                      className="text-bb-primary hover:underline"
                    >
                      {t('messages.openGroup')}
                    </Link>
                  ) : (
                    t('messages.participants', { count: activeThread.participants.length + 1 })
                  )}
                </div>
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-bb-heading touch-manipulation hover:bg-white/70"
                  aria-label={t('messages.threadSettings')}
                  aria-expanded={threadMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setThreadMenuOpen((o) => !o)}
                >
                  <IconEllipsis className="h-5 w-5" />
                </button>
                {threadMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-[20] cursor-default"
                      aria-label={t('common.cancel')}
                      onClick={() => setThreadMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-[21] mt-1 min-w-[12rem] overflow-hidden rounded-bb border border-bb-border bg-bb-content py-1 shadow-dropdown"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-4 py-2.5 text-left text-bb-sm text-bb-danger hover:bg-bb-alt"
                        onClick={() => {
                          setThreadMenuOpen(false)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        {t('messages.deleteThread')}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </header>

            <div
              ref={scrollerRef}
              onScroll={onScrollerScroll}
              className="my-messages__thread min-w-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 bb:px-5"
            >
              {hasOlder && (
                <div className="mb-3 text-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loadingOlder}
                    onClick={() => void handleLoadOlder()}
                  >
                    {loadingOlder ? t('common.loading') : t('messages.loadOlder')}
                  </Button>
                </div>
              )}

              {loadingMessages && !messages.length ? (
                <div className="space-y-3 py-4" aria-busy="true">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'h-12 max-w-[70%] animate-pulse rounded-bb-inner bg-bb-content/80',
                        i % 2 === 0 ? 'ml-auto' : 'mr-auto',
                      )}
                    />
                  ))}
                  <span className="sr-only">{t('common.loading')}</span>
                </div>
              ) : null}

              {!loadingMessages && !messages.length ? (
                <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                  <p className="m-0 text-bb-sm font-medium text-bb-heading">
                    {t('messages.threadEmpty')}
                  </p>
                  <p className="mt-1 text-bb-xs text-bb-muted">{t('messages.threadEmptyHint')}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-0.5">
                {messages.map((msg, index) => {
                  const mine = msg.mine || String(msg.senderId) === String(currentUser.id)
                  const prev = messages[index - 1]
                  const next = messages[index + 1]
                  const showDay = !prev || dayKey(prev.date) !== dayKey(msg.date)
                  const clustered = sameSenderCluster(prev, msg)
                  const clusterEnd = !sameSenderCluster(msg, next)
                  const audioOnly = !msg.deleted && isAudioOnlyMessage(msg)
                  const imageOnly = !msg.deleted && isImageOnlyMessage(msg)
                  const mediaOnly = audioOnly || imageOnly
                  const clock = formatClock(msg.date, i18n.language)
                  const status = mine ? receiptMark(msg, activeThread.isGroup) : ''
                  const voiceAvatarSrc = mine
                    ? currentUser.avatarUrl || currentUser.avatar || null
                    : msg.senderAvatar
                  const voiceAvatarName = mine
                    ? currentUser.displayName || t('messages.voiceMessage')
                    : msg.senderName

                  return (
                    <div key={msg.id}>
                      {showDay ? (
                        <div className="my-3 flex justify-center">
                          <span className="my-messages__day">
                            {formatDayLabel(msg.date, t, i18n.language)}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={clsx(
                          'flex gap-1.5',
                          mine ? 'justify-end' : 'justify-start',
                          clustered ? 'mt-0.5' : 'mt-2',
                        )}
                      >
                        {!mine && !audioOnly && (
                          <div className="w-8 shrink-0 self-end">
                            {clusterEnd ? (
                              <Avatar name={msg.senderName} src={msg.senderAvatar} size="sm" />
                            ) : null}
                          </div>
                        )}
                        <div
                          className={clsx(
                            'relative min-w-0',
                            audioOnly ? 'w-[min(88%,17.75rem)]' : 'max-w-[min(88%,22rem)] bb:max-w-[min(72%,28rem)]',
                          )}
                        >
                          <div
                            className={clsx(
                              'my-messages__bubble',
                              mine ? 'my-messages__bubble--mine' : 'my-messages__bubble--theirs',
                              !clusterEnd && 'my-messages__bubble--cluster',
                              audioOnly && !msg.deleted && 'my-messages__bubble--audio',
                              imageOnly && !msg.deleted && 'my-messages__bubble--image',
                              (!imageOnly || msg.deleted) &&
                                (!audioOnly || msg.deleted) &&
                                'my-messages__bubble--pad',
                              msg.deleted && 'my-messages__bubble--deleted',
                              msg.pending && 'my-messages__bubble--pending',
                              msg.failed && 'my-messages__bubble--failed',
                            )}
                            onContextMenu={
                              mine && !msg.deleted && !String(msg.id).startsWith('temp-')
                                ? (e) => {
                                    e.preventDefault()
                                    openMsgMenu(msg.id)
                                  }
                                : undefined
                            }
                            onTouchStart={
                              mine && !msg.deleted && !String(msg.id).startsWith('temp-')
                                ? () => startLongPress(msg.id)
                                : undefined
                            }
                            onTouchEnd={clearLongPress}
                            onTouchMove={clearLongPress}
                            onTouchCancel={clearLongPress}
                          >
                            {msg.deleted ? (
                              <p className="my-messages__tombstone m-0">
                                {t('messages.messageDeleted')}
                              </p>
                            ) : (
                              <>
                                {!mine && !clustered && !mediaOnly && activeThread.isGroup && (
                                  <div className="mb-0.5 px-0.5 text-[11px] font-semibold text-bb-primary">
                                    {msg.senderName}
                                  </div>
                                )}
                                {msg.content ? (
                                  <div
                                    className={clsx(
                                      'break-words px-0.5 leading-relaxed [&_a]:underline',
                                      mine ? '[&_a]:text-white' : '[&_a]:text-bb-primary',
                                    )}
                                    dangerouslySetInnerHTML={{ __html: msg.content }}
                                  />
                                ) : null}
                                {msg.media?.length > 0 && (
                                  <div className={clsx('space-y-2', msg.content && 'mt-1.5')}>
                                    {msg.media.map((m) => (
                                      <ChatMedia
                                        key={m.id || m.url}
                                        media={m}
                                        mine={mine}
                                        avatarSrc={voiceAvatarSrc}
                                        avatarName={voiceAvatarName}
                                        timeLabel={clock}
                                        statusLabel={status}
                                        embedMeta={mediaOnly}
                                      />
                                    ))}
                                  </div>
                                )}
                                {!mediaOnly && (
                                  <div className="my-messages__meta">
                                    <span className="inline-flex items-center gap-1">
                                      {clock}
                                      {mine ? (
                                        <span className="my-messages__checks" aria-label={status}>
                                          {msg.pending ? '…' : msg.failed ? '!' : status}
                                        </span>
                                      ) : null}
                                    </span>
                                    {msg.media?.map((m) => (
                                      <ChatMediaDownload
                                        key={`dl-${m.id || m.url}`}
                                        media={m}
                                        className={mine ? 'text-white/80' : 'text-bb-muted'}
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {msgMenuId === String(msg.id) ? (
                            <>
                              <button
                                type="button"
                                className="fixed inset-0 z-[20] cursor-default"
                                aria-label={t('common.cancel')}
                                onClick={() => setMsgMenuId(null)}
                              />
                              <div
                                role="menu"
                                className={clsx(
                                  'absolute z-[21] mt-1 min-w-[10rem] overflow-hidden rounded-bb border border-bb-border bg-bb-content py-1 shadow-dropdown',
                                  mine ? 'right-0' : 'left-0',
                                )}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="block w-full px-4 py-2.5 text-left text-bb-sm text-bb-danger hover:bg-bb-alt"
                                  onClick={() => {
                                    setMsgMenuId(null)
                                    setMessageToDelete(msg.id)
                                  }}
                                >
                                  {t('messages.deleteMessage')}
                                </button>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {typingUserId ? (
                <div className="mt-3 flex items-center gap-2 text-bb-xs text-bb-muted">
                  <span className="inline-flex gap-0.5 px-1" aria-hidden>
                    <span className="h-1.5 w-1.5 rounded-full bg-bb-muted motion-safe:animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-bb-muted motion-safe:animate-bounce [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-bb-muted motion-safe:animate-bounce [animation-delay:240ms]" />
                  </span>
                  <span>
                    {typingName
                      ? t('messages.typingNamed', { name: typingName })
                      : t('messages.typing')}
                  </span>
                </div>
              ) : null}
              <div ref={bottomRef} className="h-px" />
            </div>

            <form
              ref={composeFormRef}
              onSubmit={submit}
              className="my-messages__compose flex shrink-0 flex-col gap-2 px-2 pt-2 pb-[max(0.5rem,var(--bb-safe-bottom))]"
            >
              {sendError && (
                <p className="m-0 px-2 text-bb-xs text-bb-danger" role="alert">
                  {sendError}
                </p>
              )}

              {voiceBusy ? (
                <div className="flex items-center gap-2">
                  <div className="my-messages__input-shell flex-1 !py-2">
                    {voicePhase === 'preparing' || voicePhase === 'sending' ? (
                      <p className="m-0 flex-1 px-3 text-bb-sm text-bb-muted">
                        {voicePhase === 'preparing'
                          ? t('messages.preparingMic')
                          : t('messages.sendingAudio')}
                      </p>
                    ) : (
                      <>
                        <span
                          className="ml-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-bb-danger animate-pulse"
                          aria-hidden
                        />
                        <p className="m-0 flex-1 px-2 text-bb-sm font-medium text-bb-heading">
                          {t('messages.recording', {
                            time: formatRecordingTime(elapsedMs),
                          })}
                        </p>
                        <button
                          type="button"
                          className="mr-1 px-2 text-bb-sm text-bb-muted underline-offset-2 hover:text-bb-heading hover:underline"
                          onClick={handleCancelRecording}
                        >
                          {t('messages.cancelRecording')}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={voicePhase === 'preparing' || voicePhase === 'sending'}
                    className={clsx(
                      'my-messages__fab mb-0.5',
                      voicePhase === 'recording' && 'my-messages__fab--danger',
                    )}
                    onClick={handleMicClick}
                    aria-label={recordLabel}
                    title={recordLabel}
                    aria-pressed={voicePhase === 'recording'}
                  >
                    {voicePhase === 'preparing' || voicePhase === 'sending' ? (
                      <span className="text-bb-sm">…</span>
                    ) : (
                      <span className="block h-3.5 w-3.5 rounded-sm bg-current" aria-hidden />
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {fileUrls.length > 0 && (
                    <div className="flex flex-wrap items-end gap-2 px-1">
                      {fileUrls.map((f, index) => (
                        <div
                          key={`${f.name}-${f.size}-${index}`}
                          className="relative overflow-hidden rounded-2xl border border-bb-border bg-bb-content shadow-sm"
                        >
                          {f.image ? (
                            <img src={f.url} alt="" className="h-16 w-16 object-cover" />
                          ) : f.audio ? (
                            <div className="p-2 pr-8">
                              <ChatVoicePlayer
                                src={f.url}
                                mime={f.type}
                                mine={false}
                                showAvatar={false}
                                avatarSrc={currentUser.avatarUrl || currentUser.avatar || null}
                                avatarName={currentUser.displayName || ''}
                                downloadName={f.name || 'audio'}
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 min-w-[7rem] max-w-[12rem] items-center gap-2 px-2 pr-8">
                              <IconPaperclip className="h-4 w-4 shrink-0 text-bb-muted" />
                              <span className="truncate text-bb-xs text-bb-heading">{f.name}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-bb-heading/75 text-white hover:bg-bb-heading"
                            onClick={() => removeFileAt(index)}
                            aria-label={t('common.cancel')}
                          >
                            <IconClose className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={`${FEED_IMAGE_ACCEPT},${FEED_AUDIO_ACCEPT}`}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (recording) cancel()
                        const next = Array.from(e.target.files || [])
                        void applyFiles(next)
                        e.target.value = ''
                      }}
                    />
                    <div className="my-messages__input-shell">
                      <button
                        type="button"
                        disabled={sending}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bb-muted hover:bg-bb-alt hover:text-bb-heading disabled:opacity-40"
                        onClick={openFilePicker}
                        aria-label={t('messages.attach')}
                        title={t('messages.attach')}
                      >
                        <IconPaperclip className="h-5 w-5" />
                      </button>
                      <textarea
                        ref={draftRef}
                        value={draft}
                        rows={1}
                        onChange={(e) => {
                          setDraft(e.target.value)
                          notifyTyping(activeThread.id)
                        }}
                        onKeyDown={onDraftKeyDown}
                        onFocus={onComposeFocus}
                        enterKeyHint="send"
                        placeholder={t('messages.composePlaceholder')}
                        className="my-messages__compose-input max-h-[140px] min-h-11 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1.5 py-2.5 outline-none"
                      />
                    </div>

                    {canSend ? (
                      <button
                        type="submit"
                        disabled={!canSend || sending}
                        className="my-messages__fab mb-0.5"
                        aria-label={t('messages.send')}
                      >
                        {sending ? (
                          <span className="text-bb-sm">…</span>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                            <path d="M3.4 20.6l17.5-7.6c.8-.3.8-1.5 0-1.8L3.4 3.6c-.7-.3-1.4.3-1.2 1l1.7 6.2c.1.4.4.7.8.8l8.3.9-8.3.9c-.4.1-.7.4-.8.8L2.2 19.6c-.2.7.5 1.3 1.2 1z" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={sending || hasImages}
                        className="my-messages__fab mb-0.5"
                        onClick={handleMicClick}
                        aria-label={recordLabel}
                        title={recordLabel}
                      >
                        <IconMic className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          </>
        )}
      </section>
    </div>
  )
}
