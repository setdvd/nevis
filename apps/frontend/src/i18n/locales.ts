// The locales the app ships, first = the one in use. One list for two places:
// the Messages catalog / formatting locale (app/providers.tsx) and the build
// (vite.config.ts), which keeps react-aria's built-in texts (screen-reader
// strings of the table) for these locales only and drops its other ~33
// languages from the bundle. A new language goes here and gets a catalog.
export const APP_LOCALES = ['en-US'] as const
