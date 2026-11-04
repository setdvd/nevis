import { useI18n } from '../../../i18n/i18n-context'
import type { SumMismatch } from '../data-issues'

export type MismatchValueProps = {
    mismatch: SumMismatch
}

// A stored total that differs from the sum of its children: the stored value,
// unchanged, with a marker - a dot, a tooltip on hover, the full note while
// the cell has keyboard focus, and the same note for screen readers.
export const MismatchValue = ({ mismatch }: MismatchValueProps) => {
    const { messages, formatNumber } = useI18n()
    const stored = formatNumber(mismatch.stored)
    const note = messages.table.mismatch(
        stored,
        formatNumber(mismatch.childrenSum)
    )
    return (
        <span
            className="relative inline-flex items-center gap-1.5"
            title={note}
        >
            <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-[#c2410c] forced-colors:bg-[CanvasText]"
            />
            {stored}
            <span className="sr-only">{`, ${note}`}</span>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full right-0 z-20 mt-1 hidden rounded bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface group-focus-within/cell:block"
            >
                {note}
            </span>
        </span>
    )
}
