import preview from '../../../.storybook/preview'

import { BarChart } from './bar-chart'
import type { BarChartProps } from './bar-chart'

// domain-free sample data: ui/ knows nothing about clients
const QUARTERS = [
    'Q1 2024',
    'Q2 2024',
    'Q3 2024',
    'Q4 2024',
    'Q1 2025',
    'Q2 2025',
]

const LABELS: BarChartProps['labels'] = {
    chart: 'Orders per quarter, Q1 2024 to Q2 2025',
    total: 'Total',
    table: 'Orders per quarter',
    category: 'Quarter',
}

// typed: a plain object literal would widen the args and lose the meta args
const defaultArgs: BarChartProps = {
    categories: QUARTERS,
    series: [
        {
            name: 'Returning',
            values: [120, 140, 150, 160, 170, 190],
            color: '#b29df8',
        },
        { name: 'Web', values: [20, 25, 22, 30, 28, 35], color: '#f4beb4' },
        { name: 'Store', values: [10, 12, 15, 11, 14, 16], color: '#a75e6e' },
    ],
    yAxis: { max: 300, step: 100 },
    description: 'Use arrow keys to read each quarter. Data table follows.',
    labels: LABELS,
}

const meta = preview.meta({
    component: BarChart,
    args: defaultArgs,
    decorators: [
        (Story) => (
            <div className="rounded-card bg-surface p-6">
                <Story />
            </div>
        ),
    ],
})

export const Default = meta.story({})

// 1-order parts: still drawn 4px tall, the bar keeps its true height
export const SmallParts = meta.story({
    args: {
        series: [
            {
                name: 'Returning',
                values: [250, 260, 280, 300, 310, 330],
                color: '#b29df8',
            },
            { name: 'Web', values: [0, 1, 1, 2, 0, 2], color: '#f4beb4' },
            { name: 'Store', values: [1, 0, 1, 1, 2, 1], color: '#a75e6e' },
        ],
        yAxis: { max: 400, step: 100 },
    },
})

// more series than in the design: palette colours in order, legend wraps
export const ManySeries = meta.story({
    args: {
        series: [
            {
                name: 'Returning',
                values: [100, 110, 120, 130, 140, 150],
                color: '#b29df8',
            },
            { name: 'Web', values: [20, 22, 24, 26, 28, 30], color: '#f4beb4' },
            {
                name: 'Store',
                values: [15, 15, 16, 16, 17, 17],
                color: '#a75e6e',
            },
            { name: 'Phone', values: [10, 9, 8, 7, 6, 5], color: '#5b8def' },
            { name: 'Partner', values: [5, 6, 7, 8, 9, 10], color: '#3fb68b' },
            {
                name: 'Marketplace',
                values: [3, 6, 9, 12, 15, 18],
                color: '#e8a33d',
            },
        ],
    },
})

// 375px window: labels that would overlap are hidden, every value stays in the tooltip
export const Narrow = meta.story({
    decorators: [
        (Story) => (
            <div className="w-[343px]">
                <Story />
            </div>
        ),
    ],
})
