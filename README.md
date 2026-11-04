# Clients dashboard

Nevis frontend take-home: a stacked bar chart and an expandable tree table over client data, served by a Node.js REST API.

Work in progress. The plan, task split and project structure are in [PLAN.md](PLAN.md). This README is completed in Phase 8 (assumptions, data issues, keyboard reference, open questions, what next).

## Quick start

You need [nvm](https://github.com/nvm-sh/nvm) installed.

1. `nvm install` - installs the Node version from `.nvmrc` (26) and switches to it
2. `npm i -g pnpm@12` - Node 26 does not ship corepack
3. `pnpm i`
4. `pnpm dev` - frontend on http://localhost:5173, backend API on http://localhost:8787

## Commands

- `pnpm dev` - start frontend and backend
- `pnpm check` - lint, format check, typecheck, unit tests
- `pnpm test` - unit tests in all packages
- `pnpm e2e:install` - install Chromium for the browser tests (once per machine)
- `pnpm check:e2e` - build the web app, start API (8787) and preview (4173), run Playwright. Ports must be free.
- `pnpm storybook` - UI components on http://localhost:6006
- `pnpm generate` - regenerate client, schemas and mocks from `packages/api-contract/openapi.yaml`
- `pnpm format` - format all files
