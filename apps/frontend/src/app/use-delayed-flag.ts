import { useEffect, useState } from 'react'

// true only once `flag` has stayed true for `delayMs`; false again as soon as
// `flag` is false. Used so a fast load never announces "Loading...".
export const useDelayedFlag = (flag: boolean, delayMs: number): boolean => {
    const [elapsed, setElapsed] = useState(false)

    useEffect(() => {
        if (!flag) {
            return undefined
        }
        const timer = setTimeout(() => {
            setElapsed(true)
        }, delayMs)
        return () => {
            clearTimeout(timer)
            setElapsed(false)
        }
    }, [flag, delayMs])

    return flag && elapsed
}
