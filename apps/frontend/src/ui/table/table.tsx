import { ChevronRight } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { useRef } from 'react'
import {
    Cell as AriaCell,
    Collection,
    Column as AriaColumn,
    Row as AriaRow,
    Table as AriaTable,
    TableBody as AriaTableBody,
    TableHeader as AriaTableHeader,
} from 'react-aria-components'
import type { Key } from 'react-aria-components'
import { tv } from 'tailwind-variants/lite'

import './table.css'
import { useNoArrowScroll } from './use-no-arrow-scroll'

// Tree table on react-aria-components: role treegrid, aria-level per row,
// aria-expanded only on rows with children, Right / Left open and close,
// Up / Down / Home / End move, one Tab stop. These wrappers add the look only.

// real outline, inset so it is never clipped by the scroller; keyboard only
const FOCUS_RING =
    'outline-hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus'

// Name column: sticky on the left with a solid background, edge shadow from
// table.css while scrolled sideways. Wide screens: as wide as its names, at
// least 240px, at most the cap in RowHeaderCell (browsers ignore max-width on
// table cells); width 1px makes it shrink to that instead of taking a share of
// the spare width, which goes to the month columns. Narrow screens: fixed 160px.
const NAME_COLUMN =
    'table-sticky sticky left-0 z-10 min-w-60 text-left sm:w-px max-sm:w-40 max-sm:min-w-40 max-sm:max-w-40'

// widest the name cell's content may get on wide screens; longer names end with "..."
const NAME_MAX = 'sm:max-w-80'

const column = tv({
    base: `h-14 px-3 text-right font-normal whitespace-nowrap text-muted last:pe-6 ${FOCUS_RING}`,
    variants: {
        // header row has no fill of its own: the sticky cell needs one
        isRowHeader: {
            true: `ps-6 max-sm:ps-4 bg-surface ${NAME_COLUMN}`,
            false: '',
        },
    },
})

const row = tv({
    base: `table-row group h-14 border-b border-line bg-surface last:border-b-0 ${FOCUS_RING}`,
    variants: {
        // only rows that can open look and act clickable
        hasChildItems: { true: 'cursor-pointer hover:bg-page', false: '' },
    },
})

// group/cell: content can react to the cell's focus (e.g. show a note)
const CELL = `group/cell h-14 px-3 text-right whitespace-nowrap last:pe-6 ${FOCUS_RING}`

// bg-inherit: follows the row's fill, also on hover.
// Indent per tree level: 28px, 12px on narrow screens so names keep room.
const ROW_HEADER_CELL = `h-14 bg-inherit ps-6 pe-3 max-sm:ps-4 [--tree-indent:28px] max-sm:[--tree-indent:12px] ${NAME_COLUMN} ${FOCUS_RING}`

export type TableScrollerProps = {
    children: ReactNode
}

// Sideways scroll inside the card, never the page. scroll-padding: a focused
// month cell is scrolled clear of the sticky name column.
export const TableScroller = ({ children }: TableScrollerProps) => {
    const ref = useRef<HTMLDivElement>(null)
    useNoArrowScroll(ref)

    return (
        <div
            ref={ref}
            // scroll padding = widest name column (content max 320 + 36 padding)
            className="table-scroller overflow-x-auto overscroll-x-contain scroll-ps-[356px] max-sm:scroll-ps-40"
        >
            {children}
        </div>
    )
}

export type TableProps = {
    label: string
    // id of the column that shows the tree (indent, chevron)
    treeColumn: string
    expandedKeys: ReadonlySet<string>
    // Right / Left keys; clicks go through the rows' onAction
    onExpandedChange: (keys: Set<Key>) => void
    // true -> rows inserted from now on slide in; rows already shown stay
    animateNewRows: boolean
    children: ReactNode
}

export const Table = ({
    label,
    treeColumn,
    expandedKeys,
    onExpandedChange,
    animateNewRows,
    children,
}: TableProps) => (
    <AriaTable
        aria-label={label}
        treeColumn={treeColumn}
        expandedKeys={expandedKeys}
        onExpandedChange={onExpandedChange}
        data-animate-new-rows={animateNewRows || undefined}
        className="w-full border-collapse"
    >
        {children}
    </AriaTable>
)

export type TableHeaderProps = {
    children: ReactNode
}

export const TableHeader = ({ children }: TableHeaderProps) => (
    <AriaTableHeader className="border-b border-line bg-surface">
        {children}
    </AriaTableHeader>
)

export type ColumnProps = {
    id: string
    // cells of this column name their row for screen readers
    isRowHeader?: boolean
    children: ReactNode
}

export const Column = ({ id, isRowHeader = false, children }: ColumnProps) => (
    <AriaColumn
        id={id}
        isRowHeader={isRowHeader}
        className={column({ isRowHeader })}
    >
        {children}
    </AriaColumn>
)

export type TableBodyProps<T extends object> = {
    items: Iterable<T>
    children: (item: T) => ReactElement
}

export const TableBody = <T extends object>({
    items,
    children,
}: TableBodyProps<T>) => <AriaTableBody items={items}>{children}</AriaTableBody>

export type RowProps = {
    id: string
    // what type-ahead matches, usually the row's name
    textValue: string
    // rows with children: toggle on click, tap and Enter. Rows without: none,
    // so they do nothing when pressed and are not shown as clickable.
    onAction?: () => void
    children: ReactNode
}

export const Row = ({ id, textValue, onAction, children }: RowProps) => (
    <AriaRow
        id={id}
        textValue={textValue}
        {...(onAction !== undefined && { onAction })}
        className={({ hasChildItems }) => row({ hasChildItems })}
    >
        {children}
    </AriaRow>
)

export type ChildRowsProps<T extends object> = {
    items: Iterable<T>
    children: (item: T) => ReactElement
}

// nested rows of a row; rendered only while that row is open
export const ChildRows = <T extends object>({
    items,
    children,
}: ChildRowsProps<T>) => <Collection items={items}>{children}</Collection>

export type CellProps = {
    children: ReactNode
}

export const Cell = ({ children }: CellProps) => (
    <AriaCell className={CELL}>{children}</AriaCell>
)

// state only: the row toggles, the chevron is no control of its own
const Chevron = ({ isExpanded }: { isExpanded: boolean }) => (
    <ChevronRight
        aria-hidden="true"
        size={16}
        strokeWidth={1.5}
        className={`shrink-0 motion-safe:transition-transform ${isExpanded ? 'rotate-90' : ''}`}
    />
)

export type RowHeaderCellProps = {
    label: string
    // e.g. an avatar before the label
    leading?: ReactNode
}

// Name cell of the tree column: indent per level, chevron on rows with
// children, an empty slot on leaves so names of one level line up. Long names
// end with "..." and show in full while the row (or one of its cells) has
// keyboard focus: RAC sets data-focus-visible-within on the row then.
export const RowHeaderCell = ({ label, leading }: RowHeaderCellProps) => (
    <AriaCell className={ROW_HEADER_CELL}>
        {({ level, hasChildItems, isExpanded }) => (
            <span
                className={`flex min-w-0 items-center gap-2 ${NAME_MAX}`}
                style={{
                    paddingInlineStart: `calc(var(--tree-indent) * ${String(level - 1)})`,
                }}
            >
                {hasChildItems ? (
                    <Chevron isExpanded={isExpanded} />
                ) : (
                    <span className="size-4 shrink-0" />
                )}
                {leading}
                <span className="min-w-0 truncate group-data-[focus-visible-within]:break-words group-data-[focus-visible-within]:whitespace-normal">
                    {label}
                </span>
            </span>
        )}
    </AriaCell>
)
