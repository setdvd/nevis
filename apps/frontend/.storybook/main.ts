import { defineMain } from '@storybook/react-vite/node'

export default defineMain({
    framework: '@storybook/react-vite',
    stories: ['../src/**/*.stories.tsx'],
    addons: ['@storybook/addon-a11y'],
    // advisor photos at the same /avatars URLs the app uses (mock CDN, served
    // by the backend in the app); stories stay free of network and app state
    staticDirs: [{ from: '../../backend/static/avatars', to: '/avatars' }],
    // no usage data sent from dev machines or CI
    core: { disableTelemetry: true },
})
