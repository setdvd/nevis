import { startTransition, useState } from 'react'
import type { Key } from 'react-aria-components'

import { nextExpanded, toggleExpanded } from './table-tree'
import type { ClientsTableNode } from './table-tree'

export type ExpandedRows = {
    expanded: ReadonlySet<string>
    // true once the user has opened or closed a row: rows inserted from then on slide in
    animateNewRows: boolean
    // click, tap, Enter
    toggle: (id: string) => void
    // Right / Left keys (the table's onExpandedChange)
    onExpandedChange: (keys: Set<Key>) => void
}

// Which rows are open. Start: the root open, everything else closed. Closing
// a row also closes its open descendants. Opening or closing re-renders every
// visible row, so the change is a transition: the press paints at once and
// React renders the rows in chunks it can pause (INP).
export const useExpandedRows = (tree: ClientsTableNode): ExpandedRows => {
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(
        () => new Set([tree.id])
    )
    const [animateNewRows, setAnimateNewRows] = useState(false)

    const toggle = (id: string) => {
        startTransition(() => {
            setAnimateNewRows(true)
            setExpanded((previous) => toggleExpanded(previous, id, tree))
        })
    }

    const onExpandedChange = (keys: Set<Key>) => {
        startTransition(() => {
            setAnimateNewRows(true)
            setExpanded((previous) =>
                nextExpanded(previous, new Set([...keys].map(String)), tree)
            )
        })
    }

    return { expanded, animateNewRows, toggle, onExpandedChange }
}
