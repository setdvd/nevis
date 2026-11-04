import { tv } from 'tailwind-variants/lite'

// pulse animates opacity only, and only without reduced motion
const skeleton = tv({
    base: 'block bg-skeleton motion-safe:animate-pulse',
    variants: {
        shape: {
            rect: 'rounded',
            circle: 'rounded-full',
        },
    },
})

export type SkeletonProps = {
    // size only, e.g. 'h-4 w-24': the skeleton owns colour, shape and motion
    size: string
    shape?: 'rect' | 'circle'
}

// placeholder shape: hidden from screen readers, the page announces loading
export const Skeleton = ({ size, shape = 'rect' }: SkeletonProps) => (
    <span aria-hidden="true" className={`${skeleton({ shape })} ${size}`} />
)
