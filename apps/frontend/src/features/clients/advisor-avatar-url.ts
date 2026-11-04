// Mock CDN: in dev and preview the backend serves static/avatars/<advisorId>.jpg
// and Vite proxies /avatars to it. In production, point this at a real CDN
// (absolute URL, e.g. from a build-time env variable): edge caching, resizing
// per device and no image traffic on the API server.
const AVATAR_BASE_URL = '/avatars'

export const advisorAvatarUrl = (advisorId: string): string =>
    `${AVATAR_BASE_URL}/${encodeURIComponent(advisorId)}.jpg`
