import optimizeLocales from '@react-aria/optimize-locales-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// with the extension: Vite's native config loader needs it
import { APP_LOCALES } from './src/i18n/locales.ts'

const API = 'http://localhost:8787'

// same-origin paths the API serves: data and advisor photos
const proxy = { '/clients': API, '/avatars': API }

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        // react-aria ships its texts in ~34 languages (33 kB minified in our
        // bundle); keep only the app's own (README, "Performance")
        optimizeLocales.vite({ locales: APP_LOCALES }),
    ],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
})
