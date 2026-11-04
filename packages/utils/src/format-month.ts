// No date library on purpose: we only turn 'YYYY-MM' into a label, and Intl is
// built in (0 kB). Switch to date-fns if date needs grow (parsing, arithmetic,
// ranges, relative time).

const YEAR_MONTH = /^([0-9]{4})-(0[1-9]|1[0-2])$/

// one instance: creating an Intl formatter is the costly part.
// timeZone UTC: the label must not depend on the device time zone.
const monthName = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
})

// '2024-02' -> 'Feb 2024'. Intl gives only the month name; the year is kept as
// written (Intl would print year 99 as '99', Date.UTC maps 0-99 to 1900-1999).
export const formatMonth = (yearMonth: string): string => {
    const match = YEAR_MONTH.exec(yearMonth)
    const year = match?.[1]
    const month = match?.[2]
    if (year === undefined || month === undefined) {
        throw new RangeError(
            `Invalid month, expected YYYY-MM: ${JSON.stringify(yearMonth)}`
        )
    }
    return `${monthName.format(Date.UTC(2000, Number(month) - 1, 1))} ${year}`
}
