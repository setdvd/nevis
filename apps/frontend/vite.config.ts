import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API = 'http://localhost:8787'

// same-origin paths the API serves: data and advisor photos
const proxy = { '/clients': API, '/avatars': API }

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
})
