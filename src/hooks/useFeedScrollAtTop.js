import { useEffect, useState } from 'react'
import { FEED_SCROLL_TOP_THRESHOLD, isFeedScrolledToTop } from '../features/activity/feedScroll'

/** Suit si la fenêtre est proche du haut (fil non scrollé). */
export function useFeedScrollAtTop(threshold = FEED_SCROLL_TOP_THRESHOLD) {
  const [atTop, setAtTop] = useState(() => isFeedScrolledToTop(threshold))

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setAtTop(isFeedScrolledToTop(threshold))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [threshold])

  return atTop
}
