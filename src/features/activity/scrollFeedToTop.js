/**
 * Remonte la fenêtre en haut du fil après un refresh / publish.
 * Double rAF : attend le paint React (nouveaux posts prepend) pour éviter
 * que le scroll anchoring annule le déplacement.
 */
export function scrollFeedToTop() {
  const jump = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(jump)
  })
}
