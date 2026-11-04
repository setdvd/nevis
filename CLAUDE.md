# CLAUDE.md

Plan, task split and target structure: [PLAN.md](PLAN.md). Brief: `requirements.md` (copy of the PDF).

## Commands

- `nvm use` - Node 26 from `.nvmrc`
- `pnpm i` - install
- `pnpm dev` - start frontend (5173) and backend (8787)
- `pnpm check` - lint, format check, typecheck, unit tests; must pass before a phase is done
- `pnpm check:e2e` - Playwright browser tests (ports 4173 and 8787 must be free)
- `pnpm screenshots` - regenerate `docs/screenshots/` (same servers and ports as `check:e2e`)
- `pnpm generate` - regenerate `packages/api-contract/src/generated/` from `openapi.yaml`

## Rules

- Type safety as strict as possible; no `any`, no casts without a comment saying why.
- Never edit `packages/api-contract/src/generated/` by hand; change `openapi.yaml` and run `pnpm generate`.
- Layers in `apps/frontend/src`: `ui/` is domain-free (no `features/`, `app/` or `@nevis/api-contract` imports), `features/` maps contract data to `ui/` props, `app/` composes. ESLint enforces this.
- One folder per component, kebab-case files, named exports only, `type` not `interface`.
- Tests and stories live next to the code (`*.test.ts`, `*.stories.tsx`).
- Show stored values; never "fix" the data in the UI or the API.
- Single responsibility: a data Loader only fetches and shows loading / error, then hands the data on (`children(data)`); render components take plain data props; state and side effects go into named hooks; a part with its own look gets its own component.
- All user-facing text lives in `apps/frontend/src/i18n/` (`Messages` type + `en` catalog), read with `useI18n()` in `features/` and `app/`; `ui/` gets text as props. Text with values is a function; numbers and months go through `formatNumber` / `formatMonth` of `useI18n()`. Logic returns codes (e.g. `LoadErrorReason`), not words. Not copy: channel names from the data, dev console warnings.
- Load state: use TanStack Query types (`UseQueryResult`, `query.status`) directly; no own wrapper type like `Loadable`.
