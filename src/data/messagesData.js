/** Données de démo — Phase 4 (messagerie) */

export const demoThreads = [
  {
    id: 11,
    subject: 'Meetup tomorrow',
    participants: [
      { id: 2, displayName: 'Sophie Durand', avatar: null },
    ],
    unread: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    messages: [
      {
        id: 1101,
        senderId: 2,
        senderName: 'Sophie Durand',
        content: 'Hey, are we still on for the meetup tomorrow?',
        date: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: 1102,
        senderId: 1,
        senderName: 'Alex Martin',
        content: 'Yes! Same café at 6pm works for me.',
        date: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 1103,
        senderId: 2,
        senderName: 'Sophie Durand',
        content: 'Perfect — I’ll bring the slides.',
        date: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
    ],
  },
  {
    id: 12,
    subject: 'Design Crew',
    participants: [
      { id: 4, displayName: 'Camille Roux', avatar: null },
      { id: 2, displayName: 'Sophie Durand', avatar: null },
    ],
    unread: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    isGroup: true,
    messages: [
      {
        id: 1201,
        senderId: 4,
        senderName: 'Camille Roux',
        content: 'New mockups uploaded in the shared folder.',
        date: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
      },
      {
        id: 1202,
        senderId: 2,
        senderName: 'Sophie Durand',
        content: 'Looks great — feedback in the Figma comments.',
        date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ],
  },
  {
    id: 13,
    subject: 'Proposal feedback',
    participants: [
      { id: 3, displayName: 'Julien Petit', avatar: null },
    ],
    unread: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    messages: [
      {
        id: 1301,
        senderId: 3,
        senderName: 'Julien Petit',
        content: 'Thanks for the feedback on the proposal!',
        date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      },
      {
        id: 1302,
        senderId: 1,
        senderName: 'Alex Martin',
        content: 'Anytime — let’s iterate on section 2 next week.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
      },
    ],
  },
  {
    id: 14,
    subject: 'Welcome Nora',
    participants: [
      { id: 5, displayName: 'Nora Benali', avatar: null },
    ],
    unread: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    messages: [
      {
        id: 1401,
        senderId: 1,
        senderName: 'Alex Martin',
        content: 'Welcome to the community, Nora!',
        date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      },
      {
        id: 1402,
        senderId: 5,
        senderName: 'Nora Benali',
        content: 'Thanks Alex — excited to be here 🙌',
        date: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
      },
    ],
  },
]

export function threadPreview(thread) {
  const last = thread.messages[thread.messages.length - 1]
  return {
    id: thread.id,
    name: thread.isGroup
      ? thread.subject
      : thread.participants.map((p) => p.displayName).join(', '),
    excerpt: last?.content || '',
    time: last?.date || thread.updatedAt,
    unread: thread.unread,
  }
}
