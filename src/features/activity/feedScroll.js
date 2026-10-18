/** Seuil (px) : en dessous, on considère que l’utilisateur est « en haut » du fil. */
export const FEED_SCROLL_TOP_THRESHOLD = 120

export function isFeedScrolledToTop(threshold = FEED_SCROLL_TOP_THRESHOLD) {
  if (typeof window === 'undefined') return true
  return window.scrollY <= threshold
}
