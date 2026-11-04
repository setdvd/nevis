import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

// Width of an element in px, 0 until known. Read once before the first paint
// (layout effect), so nothing is drawn at a wrong size, then kept up to date by
// one ResizeObserver (at most one callback per frame, no scroll or resize
// listener).
export const useElementWidth = (ref: RefObject<HTMLElement | null>): number => {
    const [width, setWidth] = useState(0)

    useLayoutEffect(() => {
        const element = ref.current
        if (element === null) {
            return undefined
        }
        setWidth(element.getBoundingClientRect().width)
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry !== undefined) {
                setWidth(entry.borderBoxSize[0]?.inlineSize ?? 0)
            }
        })
        observer.observe(element)
        return () => {
            observer.disconnect()
        }
    }, [ref])

    return width
}
