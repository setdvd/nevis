// WCAG 2.x contrast ratio of two '#rrggbb' colours (test helper)
const channel = (value: number): number => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string): number => {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
    if (match === null) {
        throw new RangeError(`Expected #rrggbb, got ${hex}`)
    }
    const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)))
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

export const contrastRatio = (a: string, b: string): number => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}
