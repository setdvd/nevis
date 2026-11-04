// No date library on purpose: we only turn 'YYYY-MM' into a label, and Intl is
// built in (0 kB). Switch to date-fns if date needs grow (parsing, arithmetic,
// ranges, relative time).

const YEAR_MONTH = /^([0-9]{4})-(0[1-9]|1[0-2])$/

// one formatter per locale: creating an Intl formatter is the costly part.
// timeZone UTC: the label must not depend on the device time zone.
const monthNames = new Map<string, Intl.DateTimeFormat>()

const monthNameFormat = (locale: string): Intl.DateTimeFormat => {
    const cached = monthNames.get(locale)
    if (cached !== undefined) {
        return cached
    }
    const created = new Intl.DateTimeFormat(locale, {
        month: 'short',
        timeZone: 'UTC',
    })
    monthNames.set(locale, created)
    return created
}

// '2024-02' -> 'Feb 2024' (en-US). Intl gives only the month name, in the
// given locale; the year is kept as written (Intl would print year 99 as '99',
// Date.UTC maps 0-99 to 1900-1999).
export const formatMonth = (yearMonth: string, locale = 'en-US'): string => {
    const match = YEAR_MONTH.exec(yearMonth)
    const year = match?.[1]
    const month = match?.[2]
    if (year === undefined || month === undefined) {
        throw new RangeError(
            `Invalid month, expected YYYY-MM: ${JSON.stringify(yearMonth)}`
        )
    }
    return `${monthNameFormat(locale).format(Date.UTC(2000, Number(month) - 1, 1))} ${year}`
}
