import type { Company } from '@nevis/api-contract/model'

// Name of the stored channel that is replaced by the derived series: data,
// matched as stored, not display text (the label comes from the messages).
const EXISTING_CHANNEL = 'Existing clients'

// Same hex as --color-series-* in index.css (checked in the test): ECharts
// needs real colours, it cannot resolve CSS variables.
export const EXISTING_COLOR = '#b29df8'
export const CHANNEL_COLORS = [
    '#f4beb4',
    '#a75e6e',
    '#5b8def',
    '#3fb68b',
    '#e8a33d',
    '#4bb3c8',
] as const

const AXIS_STEP = 100

// the derived bottom series, or a channel by its name from the data
export type ChartSeries =
    | { kind: 'existing'; values: readonly number[] }
    | { kind: 'channel'; name: string; values: readonly number[] }

const addValues = (
    sum: readonly number[],
    values: readonly number[]
): number[] => sum.map((value, index) => value + (values[index] ?? 0))

// One stacked bar per month for the whole company (PLAN.md decision 3):
// - every channel other than "Existing clients", summed over all advisors, in
//   the order first found in the data;
// - "Existing clients" at the bottom = Company value minus all those channels,
//   never below 0, so each bar reaches the Company total. Only one advisor has
//   channels, so summing channels alone would give about 25 instead of 250.
// Clients without a recorded channel are counted in "Existing clients": a
// guess, and an open question for the product owner.
export const toChartSeries = (company: Company): ChartSeries[] => {
    const zeros = company.values.map(() => 0)
    const sums = new Map<string, number[]>()
    const channels = company.branches
        .flatMap((branch) => branch.employees ?? [])
        .flatMap((advisor) => advisor.channels ?? [])
    for (const channel of channels) {
        if (channel.name !== EXISTING_CHANNEL) {
            sums.set(
                channel.name,
                addValues(sums.get(channel.name) ?? zeros, channel.values)
            )
        }
    }
    const newClients = [...sums.values()].reduce(addValues, zeros)
    const existing = company.values.map((value, index) =>
        Math.max(0, value - (newClients[index] ?? 0))
    )
    return [
        { kind: 'existing', values: existing },
        ...[...sums].map(([name, values]) => ({
            kind: 'channel' as const,
            name,
            values,
        })),
    ]
}

// bar height per month: the sum of its parts
export const barTotals = (series: readonly ChartSeries[]): number[] =>
    series.reduce<number[]>(
        (totals, { values }) => addValues(totals, values),
        series[0]?.values.map(() => 0) ?? []
    )

// steps of 100, top strictly above the highest bar (350 -> 400, 400 -> 500)
export const yAxisFor = (maxTotal: number): { max: number; step: number } => ({
    max: (Math.floor(maxTotal / AXIS_STEP) + 1) * AXIS_STEP,
    step: AXIS_STEP,
})

// Existing: its own colour; other channels: the palette in order of the series
export const seriesColors = (series: readonly ChartSeries[]): string[] => {
    let next = 0
    return series.map(({ kind }) => {
        if (kind === 'existing') {
            return EXISTING_COLOR
        }
        const color = CHANNEL_COLORS[next % CHANNEL_COLORS.length]
        next += 1
        return color ?? CHANNEL_COLORS[0]
    })
}
