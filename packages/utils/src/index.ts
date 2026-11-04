// Phase 1: formatMonth (see PLAN.md), built on the native Intl.DateTimeFormat.
// No date library on purpose: one month label is all we format, and Intl costs 0 kB of bundle.
// If date needs grow (parsing, arithmetic, ranges, relative time), switch to date-fns.
export {}
