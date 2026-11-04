import { describe, expect, it } from 'vitest'

import { contrastRatio } from '../../test/contrast'

import { AVATAR_TINTS, avatarTint, initials } from './avatar-helpers'

// --color-ink in index.css
const INK = '#141413'

describe('initials', () => {
    it.each([
        ['Anna Blackwood', 'AB'],
        ['Mary Ann Smith', 'MS'],
        ['Plato', 'P'],
        ['  robert   chen  ', 'RC'],
        ['Élodie Ørsted', 'ÉØ'],
        // decomposed: E + combining acute accent
        ['Élodie Smith', 'ÉS'],
        ['', ''],
    ])('%j -> %j', (name, expected) => {
        expect(initials(name)).toBe(expected)
    })
})

describe('avatarTint', () => {
    it('gives the same tint for the same seed', () => {
        const seed = 'e3c4637b-2f21-4b7e-883e-b13ae1a6df6a'
        expect(avatarTint(seed)).toBe(avatarTint(seed))
    })

    it('always picks a palette tint', () => {
        for (const seed of ['', 'a', 'Anna Blackwood', '🙂', 'x'.repeat(500)]) {
            expect(AVATAR_TINTS).toContain(avatarTint(seed))
        }
    })

    it('varies across the advisor ids of the delivered data', () => {
        const advisorIds = [
            'e3c4637b-2f21-4b7e-883e-b13ae1a6df6a',
            'afe9ebc0-6c35-4690-80b0-20e9bc0d8c7d',
            'bb012770-02d3-4999-aa08-c11a9065235d',
            '61cd9425-2d8e-456f-b228-f7e7c6a76e5d',
            '3e4efd29-e7e4-4695-a1dc-6f3b0853c19d',
        ]
        expect(new Set(advisorIds.map(avatarTint)).size).toBeGreaterThan(1)
    })

    it.each(AVATAR_TINTS)('%s keeps ink text at 4.5:1 or more', (tint) => {
        expect(contrastRatio(INK, tint)).toBeGreaterThanOrEqual(4.5)
    })
})
