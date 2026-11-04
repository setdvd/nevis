import '../src/index.css'

import addonA11y from '@storybook/addon-a11y'
import { definePreview } from '@storybook/react-vite'

export default definePreview({
    addons: [addonA11y()],
    parameters: {
        a11y: { test: 'error' },
    },
})
