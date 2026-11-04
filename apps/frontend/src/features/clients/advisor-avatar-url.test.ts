import { describe, expect, it } from 'vitest'

import { advisorAvatarUrl } from './advisor-avatar-url'

describe('advisorAvatarUrl', () => {
    it('builds the file URL from the advisor id', () => {
        expect(advisorAvatarUrl('e3c4637b-2f21-4b7e-883e-b13ae1a6df6a')).toBe(
            '/avatars/e3c4637b-2f21-4b7e-883e-b13ae1a6df6a.jpg'
        )
    })

    it('keeps an odd id inside the avatars folder', () => {
        expect(advisorAvatarUrl('../a b?c')).toBe('/avatars/..%2Fa%20b%3Fc.jpg')
    })
})
