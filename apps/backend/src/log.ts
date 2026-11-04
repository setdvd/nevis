type Level = 'info' | 'warn' | 'error'

// fixed keys come from log() itself, so fields cannot overwrite them
type Fields = Readonly<Record<string, unknown>> & {
    readonly time?: never
    readonly level?: never
    readonly event?: never
}

// JSON Lines: one object per line. info -> stdout, warn / error -> stderr.
export const log = (level: Level, event: string, fields?: Fields): void => {
    console[level](
        JSON.stringify({
            time: new Date().toISOString(),
            level,
            event,
            ...fields,
        })
    )
}
