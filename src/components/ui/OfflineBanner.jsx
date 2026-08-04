import { useOffline } from '../../hooks/useOffline'

/** Bandeau connectivité + file de sync offline */
export function OfflineBanner() {
  const { online, queueCount } = useOffline()

  if (online && queueCount === 0) return null

  return (
    <div
      role="status"
      className={`px-4 py-2 text-center text-bb-sm font-medium ${
        online ? 'bg-[rgba(20,181,80,0.12)] text-bb-success' : 'bg-[rgba(237,150,21,0.15)] text-bb-warning'
      }`}
    >
      {!online && (
        <span>
          Mode hors-ligne — vos brouillons seront synchronisés au retour du réseau
          {queueCount > 0 ? ` (${queueCount} en file)` : ''}.
        </span>
      )}
      {online && queueCount > 0 && (
        <span>Synchronisation : {queueCount} élément(s) en attente…</span>
      )}
    </div>
  )
}
