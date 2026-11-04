import { BarChart as EChartsBar } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsType } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import EChartsReactCore from 'echarts-for-react/esm/core'

import { BAR_CHART_PLOT_HEIGHT } from './bar-chart-model'
import type { BarChartOption } from './bar-chart-model'

// Tree-shaken: only the bar chart, grid, tooltip and the SVG renderer
// (36 bars: few elements, sharp at any size, no canvas re-raster on resize).
echarts.use([EChartsBar, GridComponent, TooltipComponent, SVGRenderer])

const OPTS = { renderer: 'svg' } as const

export type BarChartPlotProps = {
    // keep it stable between renders: setOption runs only when it changes
    option: BarChartOption
    // the ECharts instance, for actions like showing the tooltip
    onReady: (instance: EChartsType) => void
}

// The ECharts binding, nothing else: draws the option, follows the container
// size. Hidden from screen readers: the chart's owner gives the accessible
// version.
export const BarChartPlot = ({ option, onReady }: BarChartPlotProps) => (
    <div aria-hidden="true">
        <EChartsReactCore
            echarts={echarts}
            option={option}
            opts={OPTS}
            style={{ height: BAR_CHART_PLOT_HEIGHT, width: '100%' }}
            onChartReady={onReady}
        />
    </div>
)
