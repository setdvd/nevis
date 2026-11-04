// Light tints: dark text (ink) on each is well above 4.5:1 (checked in the test).
export const AVATAR_TINTS = [
    '#fde68a',
    '#d9f99d',
    '#bae6fd',
    '#fbcfe8',
    '#ddd6fe',
    '#fed7aa',
] as const

// graphemes, not code units: 'É' written as E + accent stays one letter
const graphemes = new Intl.Segmenter('en-US', { granularity: 'grapheme' })

const firstLetter = (word: string | undefined): string =>
    word === undefined
        ? ''
        : (graphemes.segment(word)[Symbol.iterator]().next().value?.segment ??
          '')

// first letter of the first and of the last word; one word -> one letter
export const initials = (name: string): string => {
    const words = name
        .trim()
        .split(/\s+/u)
        .filter((word) => word !== '')
    const last = words.length > 1 ? words.at(-1) : undefined
    return (firstLetter(words[0]) + firstLetter(last)).toLocaleUpperCase(
        'en-US'
    )
}

// FNV-1a hash: the same seed always gives the same tint, whatever the render order
export const avatarTint = (seed: string): string => {
    let hash = 0x811c9dc5
    for (const char of seed) {
        hash ^= char.codePointAt(0) ?? 0
        hash = Math.imul(hash, 0x01000193)
    }
    return AVATAR_TINTS[(hash >>> 0) % AVATAR_TINTS.length] ?? AVATAR_TINTS[0]
}
