import { useEffect } from 'react'

/** Keeps the browser tab label in step with the current screen. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Uber`
  }, [title])
}
