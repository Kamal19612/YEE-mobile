/** Données de démo — Phase 4 (messagerie pairs-à-pairs) */

export const demoThreads = [
  {
    id: 11,
    subject: 'Relecture de récit',
    participants: [{ id: 2, displayName: 'Fatou Diallo', avatar: null }],
    unread: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    messages: [
      {
        id: 1101,
        senderId: 2,
        senderName: 'Fatou Diallo',
        content: 'Merci pour ton récit sur l’évaluation participative.',
        date: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: 1102,
        senderId: 1,
        senderName: 'Amina Okonkwo',
        content: 'Avec plaisir — je peux relire le tien avant soumission.',
        date: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 1103,
        senderId: 2,
        senderName: 'Fatou Diallo',
        content: 'Parfait, je t’envoie le brouillon ce soir.',
        date: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
    ],
  },
  {
    id: 12,
    subject: 'Cohorte Afrique de l’Ouest',
    participants: [
      { id: 4, displayName: 'Kwame Asante', avatar: null },
      { id: 2, displayName: 'Fatou Diallo', avatar: null },
    ],
    unread: true,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    isGroup: true,
    messages: [
      {
        id: 1201,
        senderId: 4,
        senderName: 'Kwame Asante',
        content: 'New guide available in Resources — story consent checklist.',
        date: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
      },
      {
        id: 1202,
        senderId: 2,
        senderName: 'Fatou Diallo',
        content: 'Merci Kwame — on le traduit en français cette semaine.',
        date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ],
  },
  {
    id: 13,
    subject: 'Invitation cohorte',
    participants: [{ id: 3, displayName: 'Jean-Baptiste Nkomo', avatar: null }],
    unread: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    messages: [
      {
        id: 1301,
        senderId: 3,
        senderName: 'Jean-Baptiste Nkomo',
        content: 'Peux-tu relire mon brouillon avant soumission ?',
        date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      },
      {
        id: 1302,
        senderId: 1,
        senderName: 'Amina Okonkwo',
        content: 'Oui, envoie-le via le composeur en brouillon partagé.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
      },
    ],
  },
]

/** Aperçu pour le dropdown header */
export function threadPreview(thread) {
  const last = thread.messages?.[thread.messages.length - 1]
  const other = thread.participants?.[0]
  return {
    id: thread.id,
    name: thread.isGroup ? thread.subject : other?.displayName || thread.subject,
    excerpt: last?.content || '',
    time: last?.date || thread.updatedAt,
    unread: Boolean(thread.unread),
  }
}
