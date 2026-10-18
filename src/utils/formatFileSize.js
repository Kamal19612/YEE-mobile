/** Affiche une taille de fichier lisible (Mo / Ko). */
export function formatFileSize(bytes, locale = undefined) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) {
    return `${(n / 1024).toLocaleString(locale, { maximumFractionDigits: 0 })} Ko`
  }
  return `${(n / (1024 * 1024)).toLocaleString(locale, { maximumFractionDigits: 1 })} Mo`
}
