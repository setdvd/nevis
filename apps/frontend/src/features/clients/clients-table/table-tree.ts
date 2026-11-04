import type {
    AcquisitionChannel,
    Advisor,
    Branch,
    Company,
} from '@nevis/api-contract/model'

// One shape for every level, so the table renders the tree without knowing
// which level a row is (except for kind-specific extras like the avatar).
export type ClientsTableNode = {
    id: string
    name: string
    values: readonly number[]
    kind: 'company' | 'branch' | 'advisor' | 'channel'
    // missing = leaf; never an empty list
    children?: readonly ClientsTableNode[]
}

// The nesting is not uniform (Branch 2 / 3 have no employees, only one advisor
// has channels): a missing or empty child list both mean "leaf".
const withChildren = (
    node: ClientsTableNode,
    children: readonly ClientsTableNode[] | undefined
): ClientsTableNode =>
    children === undefined || children.length === 0
        ? node
        : { ...node, children }

const channelNode = ({
    id,
    name,
    values,
}: AcquisitionChannel): ClientsTableNode => ({
    id,
    name,
    values,
    kind: 'channel',
})

const advisorNode = ({
    id,
    name,
    values,
    channels,
}: Advisor): ClientsTableNode =>
    withChildren(
        { id, name, values, kind: 'advisor' },
        channels?.map(channelNode)
    )

const branchNode = ({
    id,
    name,
    values,
    employees,
}: Branch): ClientsTableNode =>
    withChildren(
        { id, name, values, kind: 'branch' },
        employees?.map(advisorNode)
    )

export const toTableTree = ({
    id,
    name,
    values,
    branches,
}: Company): ClientsTableNode =>
    withChildren(
        { id, name, values, kind: 'company' },
        branches.map(branchNode)
    )

const findNode = (
    node: ClientsTableNode,
    id: string
): ClientsTableNode | undefined => {
    if (node.id === id) {
        return node
    }
    for (const child of node.children ?? []) {
        const found = findNode(child, id)
        if (found !== undefined) {
            return found
        }
    }
    return undefined
}

const descendantIds = (node: ClientsTableNode): string[] =>
    (node.children ?? []).flatMap((child) => [
        child.id,
        ...descendantIds(child),
    ])

// Closing a row also closes everything open below it, so reopening it shows
// its children closed.
export const collapseKeys = (
    expanded: ReadonlySet<string>,
    closedId: string,
    tree: ClientsTableNode
): Set<string> => {
    const closed = findNode(tree, closedId)
    const removed = new Set([
        closedId,
        ...(closed === undefined ? [] : descendantIds(closed)),
    ])
    return new Set([...expanded].filter((id) => !removed.has(id)))
}

// From the old expanded set and the one the table asks for (a toggle, or
// Right / Left keys): keep what was added, close removed rows with their
// descendants. Only rows that have children can be expanded.
export const nextExpanded = (
    previous: ReadonlySet<string>,
    requested: ReadonlySet<string>,
    tree: ClientsTableNode
): Set<string> => {
    const removed = [...previous].filter((id) => !requested.has(id))
    const closed = removed.reduce<ReadonlySet<string>>(
        (keys, id) => collapseKeys(keys, id, tree),
        previous
    )
    const added = [...requested].filter(
        (id) => !previous.has(id) && findNode(tree, id)?.children !== undefined
    )
    return new Set([...closed, ...added])
}

// toggle one row: open it, or close it with its descendants
export const toggleExpanded = (
    previous: ReadonlySet<string>,
    id: string,
    tree: ClientsTableNode
): Set<string> => {
    const requested = new Set(previous)
    if (requested.has(id)) {
        requested.delete(id)
    } else {
        requested.add(id)
    }
    return nextExpanded(previous, requested, tree)
}
