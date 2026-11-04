import type { ReactNode } from 'react'
import { tv } from 'tailwind-variants/lite'

// content at most 1408px, centred, at least 16px from the window edges
const page = tv({
    base: 'mx-auto box-content flex max-w-content flex-col gap-4 px-4 py-6',
    variants: {
        align: {
            // cards fill the width
            stretch: '',
            // short content (e.g. the crash fallback) keeps its own width
            start: 'items-start',
        },
    },
})

export type PageProps = {
    align?: 'stretch' | 'start'
    children: ReactNode
}

// the one <main> landmark of the app
export const Page = ({ align = 'stretch', children }: PageProps) => (
    <main className={page({ align })}>{children}</main>
)
