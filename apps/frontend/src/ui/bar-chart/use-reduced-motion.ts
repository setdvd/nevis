import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const subscribe = (onChange: () => void) => {
    const media = window.matchMedia(QUERY)
    media.addEventListener('change', onChange)
    return () => {
        media.removeEventListener('change', onChange)
    }
}

// follows the system setting live, also when it changes while the page is open
export const useReducedMotion = (): boolean =>
    useSyncExternalStore(
        subscribe,
        () => window.matchMedia(QUERY).matches,
        () => false
    )
