import { useState } from 'react'
import type { FocusEvent, KeyboardEvent } from 'react'

import { stepCategory } from './bar-chart-model'

export type CategoryKeyboardOptions = {
    count: number
    // show / hide the tooltip of a category
    show: (index: number) => void
    hide: () => void
}

export type CategoryKeyboard = {
    // the keyboard's category; undefined = none yet (pointer hover has its own)
    active: number | undefined
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
    onFocus: (event: FocusEvent<HTMLElement>) => void
    onBlur: () => void
}

// Steps through the categories like a slider: arrows / Home / End, no wrap
// (stepCategory). Keyboard focus starts at the first category and shows it; a
// click or tap focuses without jumping. Escape hides the tooltip and keeps the
// category; leaving ends the session, so the next focus starts over.
export const useCategoryKeyboard = ({
    count,
    show,
    hide,
}: CategoryKeyboardOptions): CategoryKeyboard => {
    const [active, setActive] = useState<number | undefined>()

    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Escape') {
            hide()
            return
        }
        const next = stepCategory(active, event.key, count)
        if (next === undefined) {
            return
        }
        // the keys step the chart, they do not scroll the page
        event.preventDefault()
        setActive(next)
        show(next)
    }

    const onFocus = (event: FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(':focus-visible')) {
            setActive(0)
            show(0)
        }
    }

    const onBlur = () => {
        setActive(undefined)
        hide()
    }

    return { active, onKeyDown, onFocus, onBlur }
}
