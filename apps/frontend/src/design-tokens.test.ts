import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { contrastRatio } from './test/contrast'

// reads the real @theme values, so a token change cannot silently break contrast
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

const token = (name: string): string => {
    const match = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(
        css
    )
    const value = match?.[1]
    if (value === undefined) {
        throw new Error(`--color-${name} not found in index.css`)
    }
    return value
}

describe('design tokens', () => {
    it.each(['surface', 'page'])('text is 4.5:1 or more on %s', (bg) => {
        expect(contrastRatio(token('ink'), token(bg))).toBeGreaterThanOrEqual(
            4.5
        )
        expect(contrastRatio(token('muted'), token(bg))).toBeGreaterThanOrEqual(
            4.5
        )
    })

    // WCAG 1.4.11: focus indicator vs what is next to it
    it.each(['surface', 'page'])('focus outline is 3:1 or more on %s', (bg) => {
        expect(contrastRatio(token('focus'), token(bg))).toBeGreaterThanOrEqual(
            3
        )
    })
})
