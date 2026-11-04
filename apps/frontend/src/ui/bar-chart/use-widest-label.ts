import { useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

type Measured = { key: string; fontLoads: number; width: number }

// Width in px of the widest SVG <text> in `ref`, measured in the browser:
// label widths depend on the font and the locale's month names, so they
// cannot be computed. Undefined until measured: the caller then draws every
// label (`isDrawn` once they are in the DOM), this hook measures them in a
// layout effect and the caller draws again before the first paint, so
// overlapping labels never show. Measured again when the labels change and
// when a web font finishes loading.
export const useWidestLabel = (
    ref: RefObject<SVGGElement | null>,
    labels: readonly string[],
    isDrawn: boolean
): number | undefined => {
    const key = labels.join('\n')
    const [fontLoads, setFontLoads] = useState(0)
    const [measured, setMeasured] = useState<Measured>()
    const current =
        measured?.key === key && measured.fontLoads === fontLoads
            ? measured.width
            : undefined

    useLayoutEffect(() => {
        const group = ref.current
        if (!isDrawn || current !== undefined || group === null) {
            return
        }
        const texts = [...group.querySelectorAll('text')]
        setMeasured({
            key,
            fontLoads,
            width: Math.max(
                0,
                ...texts.map((text) => text.getComputedTextLength())
            ),
        })
    }, [ref, isDrawn, current, key, fontLoads])

    useEffect(() => {
        const onLoaded = () => {
            setFontLoads((count) => count + 1)
        }
        document.fonts.addEventListener('loadingdone', onLoaded)
        return () => {
            document.fonts.removeEventListener('loadingdone', onLoaded)
        }
    }, [])

    return current
}
