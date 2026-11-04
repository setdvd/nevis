import { useState } from 'react'

import { avatarTint, initials } from './avatar-helpers'

export type AvatarProps = {
    name: string
    // stable id: picks the tint, so one person keeps one colour
    seed: string
    // photo URL; initials on the tint show while it loads and when it fails
    src?: string
}

// decorative: the full name is always shown next to it.
// Fixed size, so neither the photo nor the fallback shifts the layout. In
// forced colours the tint is dropped, so a border keeps the circle visible.
export const Avatar = ({ name, seed, src }: AvatarProps) => {
    // remembers which src failed, so a new src gets a fresh try
    const [failedSrc, setFailedSrc] = useState<string>()
    const showPhoto = src !== undefined && src !== failedSrc

    return (
        <span
            aria-hidden="true"
            className="relative inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] leading-none font-medium text-ink forced-colors:border forced-colors:border-[CanvasText]"
            style={{ backgroundColor: avatarTint(seed) }}
        >
            {initials(name)}
            {showPhoto && (
                <img
                    src={src}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-cover"
                    onError={() => {
                        setFailedSrc(src)
                    }}
                />
            )}
        </span>
    )
}
