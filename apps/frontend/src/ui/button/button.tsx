import type { ReactNode } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import type { ButtonProps as AriaButtonProps } from 'react-aria-components'

export type ButtonProps = Omit<
    AriaButtonProps,
    'className' | 'style' | 'children'
> & {
    children: ReactNode
}

// real outline (not a shadow) so focus stays visible in forced colours;
// focus-visible: keyboard only, a click shows no ring.
// focus:outline-hidden, not outline-none: in Tailwind 4 outline-none sets
// outline-style: none, which would also hide the focus ring; outline-hidden
// still shows a system outline in forced colours.
// No colour transition: only transform / opacity animate (PLAN.md section 10).
const BUTTON = [
    'inline-flex h-8 cursor-default items-center justify-center gap-2 rounded-md px-3',
    'border border-line-strong bg-surface text-sm font-medium text-ink',
    'focus:outline-hidden hover:bg-page pressed:bg-line',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus',
    'disabled:opacity-50',
].join(' ')

export const Button = ({ children, ...props }: ButtonProps) => (
    <AriaButton {...props} className={BUTTON}>
        {children}
    </AriaButton>
)
