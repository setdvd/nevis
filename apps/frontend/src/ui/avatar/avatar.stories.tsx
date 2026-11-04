import preview from '../../../.storybook/preview'

import { Avatar } from './avatar'

const ANNA = 'e3c4637b-2f21-4b7e-883e-b13ae1a6df6a'

// photo URLs as the app builds them (Storybook serves the same files at /avatars)
const photo = (id: string) => `/avatars/${id}.jpg`

const meta = preview.meta({
    component: Avatar,
    args: { name: 'Anna Blackwood', seed: ANNA },
})

export const Photo = meta.story({ args: { src: photo(ANNA) } })

// the photo fails to load: initials on the tint stay
export const BrokenPhoto = meta.story({
    args: { src: '/avatars/missing.jpg' },
})

export const TwoWords = meta.story({})

export const ThreeWords = meta.story({
    args: { name: 'Mary Ann Smith', seed: 'mary-ann-smith' },
})

export const OneWord = meta.story({ args: { name: 'Plato', seed: 'plato' } })

const ADVISORS = [
    ['Anna Blackwood', ANNA],
    ['James Walker', 'afe9ebc0-6c35-4690-80b0-20e9bc0d8c7d'],
    ['Maria Gutierrez', 'bb012770-02d3-4999-aa08-c11a9065235d'],
    ['Robert Chen', '61cd9425-2d8e-456f-b228-f7e7c6a76e5d'],
    ['Sarah Smith', '3e4efd29-e7e4-4695-a1dc-6f3b0853c19d'],
] as const

// next to their names, as in the table
export const Advisors = meta.story({
    render: () => (
        <ul className="flex flex-col gap-2">
            {ADVISORS.map(([name, seed]) => (
                <li key={seed} className="flex items-center gap-2">
                    <Avatar name={name} seed={seed} src={photo(seed)} />
                    {name}
                </li>
            ))}
        </ul>
    ),
})

export const AdvisorsWithoutPhotos = meta.story({
    render: () => (
        <ul className="flex flex-col gap-2">
            {ADVISORS.map(([name, seed]) => (
                <li key={seed} className="flex items-center gap-2">
                    <Avatar name={name} seed={seed} />
                    {name}
                </li>
            ))}
        </ul>
    ),
})
