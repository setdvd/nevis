import { useEffect } from 'react'
import type { RefObject } from 'react'

// Left / Right inside a RAC table open, close or move focus, and RAC scrolls a
// focused cell into view itself. Without this, the browser also scrolls the
// box 40px on every Right that opens a row. A native listener: a plain div
// gets no React key handler (jsx-a11y).
export const useNoArrowScroll = (ref: RefObject<HTMLElement | null>): void => {
    useEffect(() => {
        const element = ref.current
        if (element === null) {
            return undefined
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault()
            }
        }
        element.addEventListener('keydown', onKeyDown)
        return () => {
            element.removeEventListener('keydown', onKeyDown)
        }
    }, [ref])
}
