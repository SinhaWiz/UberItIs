import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Navigating to a new screen should start at the top, not mid-scroll. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
