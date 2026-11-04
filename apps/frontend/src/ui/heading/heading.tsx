import type { ReactNode, Ref } from 'react'
import { tv } from 'tailwind-variants/lite'

const heading = tv({
    // outline-hidden: a heading only gets focus from code (e.g. after Retry)
    base: 'text-ink outline-hidden',
    variants: {
        level: {
            1: 'text-display font-normal',
            2: 'text-lg font-medium',
            3: 'text-base font-medium',
        },
    },
})

export type HeadingProps = {
    level: 1 | 2 | 3
    children: ReactNode
    // e.g. to move focus to the page heading
    ref?: Ref<HTMLHeadingElement>
}

const TAGS = { 1: 'h1', 2: 'h2', 3: 'h3' } as const

export const Heading = ({ level, children, ref }: HeadingProps) => {
    const Tag = TAGS[level]
    return (
        <Tag ref={ref} className={heading({ level })}>
            {children}
        </Tag>
    )
}
