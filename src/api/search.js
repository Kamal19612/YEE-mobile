/**
 * Recherche globale — stub tant que l’API Spring /search n’existe pas.
 * Les clients BuddyPress ont été retirés ; la page /search reste montée.
 */

export async function globalSearch(query) {
  const q = typeof query === 'string' ? query.trim() : ''
  if (!q) {
    return { members: [], groups: [], forums: [], topics: [], posts: [], activity: [] }
  }
  return { members: [], groups: [], forums: [], topics: [], posts: [], activity: [] }
}
