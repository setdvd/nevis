import type { ReactNode } from 'react'
import { useId } from 'react'

export type CardProps = {
    // not shown, as in the design; names the card for screen readers
    title: string
    children: ReactNode
}

// contain: a change inside one card never relayouts the rest of the page
export const Card = ({ title, children }: CardProps) => {
    const titleId = useId()
    return (
        <section
            aria-labelledby={titleId}
            className="overflow-hidden rounded-card bg-surface contain-layout contain-paint"
        >
            <h2 id={titleId} className="sr-only">
                {title}
            </h2>
            {children}
        </section>
    )
}
