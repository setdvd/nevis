# Implementation plan: Clients dashboard (Nevis frontend take-home)

Source of truth for the brief: `Nevis Frontend Home Assignment.pdf` (copy in `requirements.md`).
Design: [Figma: Web engineer home task](https://www.figma.com/design/t6itC2qsmr3WLPugwrVdqS/Web-engineer-home-task?node-id=1-2781).

## 1. Goal

A dashboard page "Clients" with two cards, fed by a Node.js REST API:

1. **Stacked bar chart**: client counts per month (Feb 2024 to Jan 2025), stacked by acquisition channel.
2. **Tree table**: one row per node (Company > Branch > Advisor > Channel), one column per month. Rows that have children can be expanded and collapsed with mouse, keyboard and screen reader.

Hard requirements from the brief:

| #   | Requirement                                                                | Where it is covered                          |
| --- | -------------------------------------------------------------------------- | -------------------------------------------- |
| R1  | React + TypeScript                                                         | `apps/frontend`, strict TS everywhere        |
| R2  | Data served by a Node.js REST API                                          | `apps/backend` (Hono), `GET /clients`        |
| R3  | Loading and error states in the UI                                         | Phase 4 (cards switch on the query `status`) |
| R4  | Composable component APIs with clear boundaries                            | `ui/` (domain-free) vs `features/` vs `app`  |
| R5  | Keyboard expand/collapse; hierarchy reaches assistive technology           | Phase 5 (`treegrid`, `aria-level`)           |
| R6  | Tests: at least expand/collapse and how data maps into the chart           | Phase 5, 6, 7 (Vitest + Playwright)          |
| R7  | Nothing breaks or overflows down to 375px                                  | T5.6, T6.3, e2e viewport checks              |
| R8  | Non-uniform nesting (Branch 2/3 without employees, only Anna has channels) | `toTableTree` leaf handling + tests          |
| R9  | Short README: run/test, assumptions, open questions, what next             | Phase 8                                      |
| R10 | About 6-8 hours; ship what matters most first                              | Priorities in section 8                      |

## 2. Tech stack

| Area                | Choice                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime / packages  | Node 26 (`.nvmrc`), pnpm 12 workspaces (monorepo)                                                                                           |
| Language            | TypeScript 6, strictest flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, ...)                                               |
| API                 | Hono 4 + `@hono/node-server`, run with `tsx`                                                                                                |
| API contract        | OpenAPI 3.1 (`openapi.yaml`) -> **orval** -> TS types, TanStack Query fetch client, MSW mocks (types only, no runtime validation)           |
| Web                 | React 19, Vite 8, `@vitejs/plugin-react`                                                                                                    |
| Data fetching       | TanStack Query 5 (generated `useGetClients`)                                                                                                |
| UI primitives       | `react-aria-components` (tree `Table`, `Button`): keyboard and ARIA built in                                                                |
| Styling             | Tailwind CSS 4 (`@tailwindcss/vite`), `tailwind-variants`, `tailwindcss-react-aria-components`                                              |
| Chart               | ECharts 6 (tree-shaken core, SVG renderer) + `echarts-for-react`                                                                            |
| Icons / font        | `lucide-react`, `@fontsource-variable/inter` (optical size axis)                                                                            |
| Dates               | native `Intl.DateTimeFormat`, no date library (bundle size); switch to `date-fns` only if date needs grow                                   |
| Unit tests          | Vitest 5                                                                                                                                    |
| Browser tests       | Playwright 1.64 + `@msw/playwright` (mocked states) + `@axe-core/playwright`                                                                |
| Component catalogue | Storybook 10 (`@storybook/react-vite`, `addon-a11y`)                                                                                        |
| Lint / format       | ESLint 10 flat config (typescript-eslint strict type-checked, import-x, jsx-a11y strict, react-hooks, react-refresh, storybook), Prettier 3 |

## 3. Architecture

```
packages/api-contract/openapi.yaml
        │  pnpm generate (orval)
        ▼
src/generated/model   (TS types only)  ◄── used by apps/backend AND apps/frontend
src/generated/client  (TanStack Query hooks, fetch, typed by the generated types, no runtime validation)
src/generated/...msw  (MSW handlers for tests)

apps/backend  (Hono, :8787)                 apps/frontend  (Vite, :5173 dev / :4173 preview)
  fixture typed: satisfies ClientsResponse  proxy /clients → :8787
  serves data as is (no checks)             useGetClients() → UseQueryResult → cards
                                            findDataIssues() → dev warnings + cell markers
  GET /clients → { months, company }  ◄──── same-origin fetch
  static/avatars/<id>.jpg (mock CDN)  ◄──── <img src={advisorAvatarUrl(id)}>
```

Layering rules (enforced with ESLint where possible):

- `packages/utils`: no dependencies; generic helpers only.
- `packages/api-contract`: the only place where data types live (types only, no runtime schemas). Generated code is never edited by hand.
- `apps/frontend/src/ui/*`: domain-free components. They must not import from `features/`, `app/` or `@nevis/api-contract`.
- `apps/frontend/src/features/clients/*`: domain components. They map contract data to `ui/` props.
- `apps/frontend/src/app/*`: composition: providers, page, error boundary. Owns the query and the retry flow.

Web component tree:

```
main.tsx
└─ AppErrorBoundary                      "Something went wrong." + Reload
   └─ Providers                          QueryClient defaults
      └─ DashboardPage                   layout: Page, Heading; focuses the heading when Retry starts
         └─ ClientsLoader { onRetry, children: (data) => ReactNode }
              │                          the only fetcher: useGetClients, aria-busy, status line, Retry
              ├─ pending -> ClientsLoading      both cards with skeletons
              ├─ error   -> ClientsLoadError    both cards with LoadError (chart card's is the alert)
              └─ success -> ClientsDashboard { data }
                   ├─ ChartCard { months, company }  -> ClientsChart (maps data) -> ui/BarChart
                   │                                    BarChart = BarChartPlot + useCategoryKeyboard + Legend + sr table
                   └─ TableCard { months, company }  -> ClientsTable (renders rows)
                                                        + useExpandedRows, useDataIssues, MismatchValue
                                                        -> ui/Table (RAC treegrid) + useNoArrowScroll
```

Key types and component APIs (draft):

```ts
// features/clients: load state is the TanStack Query result type, no own wrapper
import type { UseQueryResult } from '@tanstack/react-query'

type CardProps = {
    query: UseQueryResult<ClientsResponse> // Error is the default error type; switch (query.status)
    onRetry: () => void
}
type ClientsTableProps = { months: readonly string[]; company: Company }
type ClientsChartProps = { months: readonly string[]; company: Company }
type ClientsTableNode = {
    id: string
    name: string
    values: readonly number[]
    kind: 'company' | 'branch' | 'advisor' | 'channel'
    children?: readonly ClientsTableNode[] // missing = leaf
}

// ui (domain-free)
type BarChartProps = {
    categories: readonly string[]
    series: readonly {
        name: string
        values: readonly number[]
        color: string
    }[]
    yAxis: { max: number; step: number }
    description: string
    labels: { chart: string; total: string; table: string; category: string }
}
type TableProps = {
    label: string
    treeColumn: string
    expandedKeys: ReadonlySet<string>
    onExpandedChange: (keys: Set<Key>) => void
    children: ReactNode
}
```

## 4. Project structure

Files marked `(P0)` are created in the scaffold step. Everything else is created in the phase noted.

```
nevis/
├── PLAN.md                          this file
├── README.md                  (P0)  stub; completed in Phase 8
├── CLAUDE.md                  (P0)  commands + rules for agents
├── requirements.md, Task.md, *.pdf  the brief (not formatted by Prettier)
├── package.json               (P0)  root scripts: dev, check, test, check:e2e, generate, storybook, format
├── pnpm-workspace.yaml        (P0)  apps/*, packages/*
├── .nvmrc  .prettierrc  .prettierignore  .gitignore            (P0)
├── tsconfig.base.json         (P0)  strict compiler options shared by all packages
├── eslint.config.js           (P0)  one flat config for the whole repo
│
├── packages/
│   ├── utils/                       generic helpers, no deps
│   │   └── src/
│   │       ├── index.ts       (P0)  public exports
│   │       └── format-month.ts      '2024-02' -> 'Feb 2024' via Intl.DateTimeFormat (UTC), throws on bad input
│   │
│   └── api-contract/                single source of truth for the data shape
│       ├── openapi.yaml       (P1)  GET /clients -> ClientsResponse
│       ├── orval.config.ts    (P0)  react-query + fetch client, TS models, msw mocks
│       └── src/
│           ├── fixtures/clients.ts  delivered payload, verbatim + months
│           ├── clients-example.ts   small hand-made example for tests (typed)
│           ├── http/with-request-timeout.ts   10 s per attempt, non-JSON 2xx -> InvalidDataError
│           └── generated/           orval output: model/*.ts, client/clients.ts, client/clients.msw.ts
│
└── apps/
    ├── backend/                     Node REST API
    │   ├── static/avatars/          <advisorId>.jpg per advisor (64x64, 2.4 kB): mock CDN, a CDN in production
    │   └── src/
    │       ├── index.ts       (P0)  boot, serve :8787
    │       ├── app.ts               createApp(response): GET /clients, static /avatars/*, 404, 500
    │       ├── log.ts               JSON Lines logger (requests, errors)
    │       └── *.test.ts            app.request() route tests
    │
    └── frontend/                    React app
        ├── index.html  vite.config.ts  playwright.config.ts           (P0)
        ├── .storybook/main.ts, preview.ts                              (P0)
        ├── e2e/                     Playwright: *.e2e.ts, fixtures.ts (msw), handlers.ts
        │   └── smoke.e2e.ts   (P0)  page opens, heading visible
        └── src/
            ├── main.tsx       (P0)  root render
            ├── index.css      (P0)  Tailwind + design tokens (@theme)
            ├── i18n/
            │   ├── messages.ts            Messages type: every user-facing text, by place
            │   ├── en.ts                  the English catalog
            │   ├── i18n-context.ts        createI18n, useI18n (locale, messages, formatNumber, formatMonth)
            │   └── i18n-provider.tsx      I18nProvider (also sets <html lang> and the title)
            ├── reporting/
            │   └── report-data-issue.ts (+test)   reportDataIssue: every data integrity issue, once per page load (dev console now, Sentry TODO)
            ├── app/
            │   ├── providers.tsx          QueryClient defaults
            │   ├── dashboard-page.tsx     layout: heading + ClientsLoader + ClientsDashboard
            │   └── app-error-boundary.tsx
            ├── features/clients/
            │   ├── describe-load-error.ts (+test)   timeout / network / server (status) / invalid data
            │   ├── data-issues.ts (+test)          findDataIssues: sum mismatches, missing channels (FE for now, see decision 11); reportDataIssues
            │   ├── clients-loader/
            │   │   ├── clients-loader.tsx       fetches; loading / error / children(data); busy, status line, Retry
            │   │   ├── clients-loading.tsx (+stories)
            │   │   ├── clients-load-error.tsx (+stories)
            │   │   └── use-delayed-flag.ts      "Loading clients..." only after 1 s
            │   ├── clients-dashboard/clients-dashboard.tsx   the loaded content: both cards from data
            │   ├── chart-card/chart-card.tsx (+stories)      Card + ClientsChart, data props only
            │   ├── table-card/table-card.tsx (+stories)      Card + ClientsTable, data props only
            │   ├── clients-chart/
            │   │   ├── clients-chart.tsx (+stories)
            │   │   ├── clients-chart-skeleton.tsx
            │   │   └── chart-series.ts (+test)      company -> series (THE data-to-chart mapping)
            │   └── clients-table/
            │       ├── clients-table.tsx        renders the rows
            │       ├── use-expanded-rows.ts     open / closed state (transition)
            │       ├── use-data-issues.ts       mismatch lookup + reports the issues
            │       ├── mismatch-value.tsx       marked stored value
            │       ├── clients-table-skeleton.tsx
            │       └── table-tree.ts (+test)        company -> uniform tree, collapseKeys, nextExpanded
            └── ui/                  one folder per component, each with *.stories.tsx
                ├── avatar/          photo (src) with initials + tint fallback (+ helpers test)
                ├── bar-chart/       BarChart = BarChartPlot (ECharts) + useCategoryKeyboard + legend + sr data table; pure bar-chart-model
                ├── button/
                ├── card/            white surface, region named by an sr-only h2
                ├── heading/         Heading levels 1-3
                ├── load-error/      message + Retry, role=alert opt-in
                ├── page/            Page: the <main> container, max width, gutters
                ├── skeleton/        aria-hidden, motion-safe pulse
                └── table/           RAC tree table wrappers, sticky name column, chevron, useNoArrowScroll
```

Conventions: kebab-case file names, one folder per component, named exports only (no default exports, lint rule), `type` instead of `interface`, alphabetized imports, no import cycles, colocated tests (`*.test.ts`) and stories (`*.stories.tsx`).

- **Load state uses TanStack Query types only** (`UseQueryResult`, `query.status`, `query.data`, `query.error`). No own wrapper type such as `Loadable`.
- **Single responsibility** (review note, applied to all components): a data Loader (`ClientsLoader`) only fetches and shows loading / error; render components (cards, table, chart) take plain data props; state and side effects live in named hooks (`useExpandedRows`, `useDataIssues`, `useCategoryKeyboard`, `useNoArrowScroll`, `useDelayedFlag`); a part with its own look gets its own component (`MismatchValue`, `BarChartPlot`). Stories therefore need no network or query client.
- **All copy in `src/i18n/`** (review note "move all copy and prepare for i18n"): `Messages` type + `en` catalog + `I18nProvider` / `useI18n()` (locale, messages, `formatNumber`, `formatMonth` via `Intl`); `ui/` gets text as props and may not import `i18n/` (ESLint zone); logic returns codes (`loadErrorReason` -> `LoadErrorReason`, chart series `kind: 'existing' | 'channel'`), the catalog turns them into words; `formatMonth` in `utils` takes a locale.
- **Every data integrity issue is reported** (decision 12): a check sends each issue it finds to `reportDataIssue` (`src/reporting/`, a base layer like `i18n/`; `ui/` may not import it, ESLint zone). It dedupes per page load, warns in the dev console and holds the Sentry call as a TODO. The UI still shows the stored values.
- **No `notReachable` / `assertNever` helpers.** A `switch` over a union lists every case and has no `default`; `@typescript-eslint/switch-exhaustiveness-check` reports a missing case.

## 5. Data contract

`GET /clients` returns `{ months, company }`:

- `months`: exactly 12 strings `YYYY-MM`. The payload has no dates, so the API adds `2024-02` .. `2025-01` (the period stated in the brief). The UI formats them; it never hardcodes month names.
- `company`: Company (`branches` required) > Branch (`employees` optional) > Advisor (`channels` optional) > AcquisitionChannel.
- Advisor photos are **not** part of the API contract: they are static files, `/avatars/<advisorId>.jpg`, and the FE builds the URL from the id (`advisorAvatarUrl`). A mock CDN: the BE serves them in dev, a CDN should in production.
- Every node: `id` (UUID), `name` (string), `values` (12 integers >= 0).
- `additionalProperties: false` everywhere, so the generated types are closed (a child list in the wrong place is a compile error in the fixture).
- A missing child list means "leaf". An empty list is treated the same way in the UI.

No runtime schema validation, neither in the API nor in the web client. Both sides rely on the TypeScript types generated from `openapi.yaml`: the fixture is declared `satisfies ClientsResponse`, so a wrong shape fails `pnpm typecheck`, and the web client uses the typed `useGetClients` result as is. The only runtime check left is inherent to `fetch`: a 2xx body that is not JSON at all cannot be parsed (shown as "The data was not valid.").

### Data issues found (verified against the payload)

Stored totals that differ from the sum of their children:

| Node           | Month    | Stored | Sum of children |
| -------------- | -------- | -----: | --------------: |
| Company        | May 2024 |    301 |             279 |
| Branch 1       | Aug 2024 |    214 |             216 |
| Anna Blackwood | May 2024 |     31 |              30 |
| Anna Blackwood | Jun 2024 |     32 |              33 |
| Anna Blackwood | Jul 2024 |     34 |              35 |
| Anna Blackwood | Aug 2024 |     38 |              36 |
| Anna Blackwood | Sep 2024 |     27 |              28 |

Decision: show stored values unchanged. The checks run on the FE (decision 11): `findDataIssues` finds them, `reportDataIssues` reports each one once per page load (decision 12: dev console now, Sentry once set up), and the table marks each affected cell; the README lists them. **Talk to the BE team** so the discrepancies get fixed at the source; doing it on the FE is only to ship faster.

## 6. Decisions and assumptions (to be confirmed, then moved to README)

1. **API serves the data unchanged.** No totals are corrected and no levels are filled in. Fixing data is the data owner's call.
2. **Table shows stored values** for every row, never sums of children.
3. **Chart = whole company, stacked by acquisition channel** (legend: Existing clients, New organic, New paid, as in the design). Only Anna has channels, so summing channels would give about 25 instead of 250. Therefore "Existing clients" = Company value minus all other channels (never below 0), so each bar reaches the Company total. Any other channel name found in the data becomes its own series, in the order found. This is a guess; it is an open question for the product owner.
4. **Start state**: Company row open, all other rows closed.
5. **Rows without children** have no chevron and no expanded state, and do nothing on click or Enter. (Check the Figma: if it shows chevrons on every row, this is a deliberate deviation.)
6. **Closing a row closes its open descendants**, so reopening shows children closed.
7. **Advisor photos: static files by id, a mock CDN.** The data has no photo field, so `apps/backend/static/avatars/<advisorId>.jpg` holds one file per advisor (the same placeholder photo for now) and the BE serves the folder as is. The FE builds the URL from the id with `advisorAvatarUrl(id)` (`features/clients/advisor-avatar-url.ts`). In production the files belong on a CDN (edge cache, resizing per device, no image traffic on the API server); then only the base URL in that file changes. Only advisors have a file; when an image fails, the avatar shows initials on a tint.
8. **Request policy**: one automatic retry after 500 ms, 10 s timeout per attempt, no refetch on window focus or reconnect.
9. **When the design and the data disagree, the data wins.**
10. **No runtime schema validation anywhere (types only).** API and web client trust the OpenAPI contract and use the orval-generated TS types; no zod. The data is a static, typed fixture, so the compiler already guarantees its shape; runtime checks would only repeat that and add bundle size. Value rules the types cannot express (12 values, integers >= 0, UUIDs) are documented in `openapi.yaml`, not enforced.
11. **Data checks live on the FE for now.** This is an FE-oriented task, so the BE stays a thin "serve the data as is" layer and is barely touched. The FE detects sum mismatches and missing channels (`findDataIssues`), shows stored values unchanged, and marks the mismatches. The right long-term owner is the BE / data owner: **we should talk to the BE team to fix the discrepancies on the BE**; we do it on the FE only to ship faster. Code comments at both places say so.
12. **Every data integrity issue is reported.** Data that contradicts itself or the contract (today: the 7 sum mismatches and the 6 nodes without a breakdown) goes to `reportDataIssue` (`apps/frontend/src/reporting/report-data-issue.ts`), once per issue and page load, in every build. Today it writes a `console.warn` in dev and nothing in production; it should report to Sentry (warning level, one fingerprint per issue, structured details), written there as a TODO until Sentry is set up. Every new check reports through it too; showing a marker or falling back silently is not enough. Value rules the types cannot express stay unchecked (decision 10); a check added for them reports the same way.

## 7. Task split

Each phase ends with `pnpm check` green. Estimates add up to about 8 h; items marked _stretch_ are cut first.

### Phase 0: Workspace scaffold (0.25 h), done

- [x] T0.1 Root: pnpm workspace, `.nvmrc` (26), `packageManager` pnpm 12, Prettier, ESLint flat config, `tsconfig.base.json`, `.gitignore`.
- [x] T0.2 Package skeletons: `apps/backend`, `apps/frontend`, `packages/api-contract`, `packages/utils` (package.json, tsconfig, entry file).
- [x] T0.3 Web toolchain: Vite + React + Tailwind, `/clients` proxy to `:8787`, fixed ports (5173 / 4173 / 8787, `strictPort`), Storybook config, Playwright config + smoke test (not run yet: needs `pnpm e2e:install`).
- [x] T0.4 `pnpm i`; `pnpm check` passes. ESLint also enforces the `ui/` -> `features/` -> `app/` layers (section 3).

Done when: `pnpm dev` starts both apps and the page shows the "Clients" heading.

### Phase 1: Contract and utils (1 h), done

- [x] T1.1 `openapi.yaml` as in section 5, plus an `ApiError` schema (`not_found` / `internal`) for the error bodies.
- [x] T1.2 orval config: TanStack Query + fetch typed by the generated TS models, MSW mocks (`mock.exactOptional: true`, so mocks leave optional fields out instead of setting `undefined`, needed for `exactOptionalPropertyTypes`); no zod, no runtime validation; `pnpm generate`. `pnpm check:generated` only works once `src/generated` is committed.
- [x] T1.3 `fixtures/clients.ts` (payload verbatim + months, `satisfies ClientsResponse`; re-checked: 12 nodes x 12 values, the 7 mismatches of section 5) and `clients-example.ts` (consistent totals, a leaf branch, an extra "Referral" channel). Exports: `./model`, `./client`, `./mocks`, `./fixtures`, `./example`, `./http`.
- [x] T1.4 `withRequestTimeout`: `AbortSignal.any([querySignal, AbortSignal.timeout(10_000)])` per attempt; non-JSON 2xx (body that fails `JSON.parse`, or a non-JSON content type) -> `InvalidDataError`. Known limit: a non-JSON _error_ body (e.g. 502 HTML) also fails `JSON.parse` before the generated code sets `status`, so it shows as invalid data, not as a server error.
- [x] T1.5 Utils: `formatMonth` on top of one cached `Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })`. No date library: we only format a month label, and `Intl` is built in (0 kB). A comment in the file says so; if date needs grow (parsing, arithmetic, ranges, relative time), switch to `date-fns`. The year is taken from the input as written, because `year: 'numeric'` prints year 99 as "99" and `Date.UTC` maps years 0-99 to 1900-1999.
- [x] T1.6 Dropped `--passWithNoTests` in `utils`, `api-contract` and `backend`. `frontend` keeps it until its first test (moved to Phase 3).
- [x] Tests (9): JSON 200; error with HTTP status (JSON and empty body); non-JSON 2xx and non-JSON content type -> `InvalidDataError`; JSON content type with suffix and charset accepted; timeout; retry gets a fresh limit; cancel aborts the request.
- [x] Tests (14): the 12 data months; year kept as written (`0001-02` -> `Feb 0001`); `RangeError` on 9 bad inputs; same labels in `America/New_York`, `Pacific/Kiritimati`, `Asia/Kathmandu` (fresh module per `TZ`; checked that dropping `timeZone: 'UTC'` makes New York fail).

### Phase 2: API (0.25 h), done

- [x] T2.1 `createApp(response)`: `GET /clients` 200 with `Cache-Control: no-cache` + ETag (unchanged payload -> 304) and gzip; unknown route or method 404 `{"error":"not_found"}`; unhandled 500 `{"error":"internal"}` + log, no message or stack trace in the response.
- [x] T2.2 `index.ts`: listen on 8787; port taken -> `server.error` log line and exit 1. No boot validation (the fixture is type-checked) and no data checks (they run on the FE, decision 11; `TODO(BE team)` comments in `app.ts` and the fixture).
- [x] T2.3 `log.ts`: one JSON object per line (`time`, `level`, `event`, fields; fields cannot overwrite the fixed keys). Events: `server.listening`, `server.error`, `http.request` (method, path, status, durationMs), `http.unhandled_error`.
- [x] T2.4 Advisor photos as a mock CDN: `serveStatic` serves `static/avatars/<advisorId>.jpg` (one file per advisor; missing file -> 404 JSON; `..` paths rejected), `Cache-Control: public, max-age=86400` + ETag, not gzipped (already compressed). The given 256x256 PNG (68 kB) is stored as a 64x64 JPEG (2.4 kB, enough for a 20px avatar at 3x). Comments say to use a CDN in production. Vite proxies `/avatars` like `/clients`. FE `advisorAvatarUrl(id)` builds `/avatars/<id>.jpg`. Tests: BE 12 (each advisor's file 200 with the same bytes, no gzip, 304 on ETag, 404 for company id / unknown id / folder / `..` paths), FE 2.
- [x] Tests (8) via `app.request()`: data unchanged (May 301), 304 on ETag, gzip, request log line, 404 route and method, 500 with the message only in the log. Playwright now waits for `http://localhost:8787/clients`.

### Phase 3: UI foundation (0.5 h), done

- [x] T3.1 Design tokens in `index.css` (`@theme`): page `#F7F5ED`, surface `#FFFFFF`, ink `#141413`, muted `#6B6A65`, line `#ECEBE6` / `#D6D4CC`, skeleton, focus `#2F5BD3`, series `#B29DF8` / `#F4BEB4` / `#A75E6E`, card radius 8px, content max width 1408px, heading 35px; Inter Variable; tabular numbers. Contrast of ink / muted text (>= 4.5:1) and focus (>= 3:1) on surface and page is tested against the real `index.css` values (`design-tokens.test.ts`). Latin `woff2` preloaded from `index.html` (one font request, no unused-preload warning). **Still open: verify the values against the Figma.**
- [x] T3.2 `ui/` components with stories (13 stories): `Card` (region named by an sr-only `h2`, `contain: layout paint`), `Button` (RAC; `focus:outline-hidden` + `focus-visible` outline, because Tailwind 4 `outline-none` would hide the ring), `Skeleton` (aria-hidden, `size` + `shape` props, opacity pulse only without reduced motion), `LoadError` (icon, message, Retry; `announce` puts `role="alert"` on the message only), `Avatar` (initials by grapheme, FNV-1a tint from the id, aria-hidden, border in forced colours). Storybook telemetry off. `Avatar` also takes an optional photo `src` (`<img alt="">`, lazy, fixed size; initials + tint while loading and on error); Storybook serves `apps/backend/static/avatars` at `/avatars` (`staticDirs`), so the `Photo`, `BrokenPhoto` and `Advisors` stories use the same URLs as the app.
- [x] T3.3 (from the `Task.md` review note "extract headers and such stuff to ui kit"): `ui/heading` (`Heading`, levels 1-3, `ref` for focus) and `ui/page` (`Page`, the one `<main>`, `align` stretch / start), with stories; `app/` no longer styles headings or the page container inline.
- [x] Tests (20): avatar initials (incl. decomposed accents), tint stable / from palette / varied across the advisor ids, ink on every tint >= 4.5:1; design-token contrast. `frontend` test script no longer passes without tests.
- [x] Checked in Chromium (Playwright, static Storybook build): axe finds no violations in any story; focus ring on keyboard focus only (normal) and on focus (forced colours); skeleton not animated with reduced motion; one alert only when `announce` is set; card found as region by its title.

### Phase 4: Dashboard shell and load states (0.75 h), done

- [x] T4.1 `Providers`: QueryClient defaults from decision 8 (`staleTime: Infinity`, `retry: 1`, `retryDelay: 500`, `networkMode: 'always'`, no refetch on focus / reconnect), built by `createQueryClient()`; one client per `Providers` instance.
- [x] T4.2 `DashboardPage`: `h1` "Clients"; `ChartCard` + `TableCard` get `query` (`UseQueryResult<ClientsResponse>` from `useGetClients` with a stable `select`) + `onRetry`. Both are thin compositions of one `features/clients/clients-card` (`title`, `query`, `onRetry`, `announceError`, `placeholder`, `children: (data) => ReactNode`), so the load-state switch lives in one place. Chart and table content are stand-ins until Phases 5 / 6 (`TODO(Phase 5/6)`); skeletons have approximate heights for now; card area `aria-busy` while pending; sr-only status line after the cards ("Loading clients..." after 1 s; "Clients loaded" after a successful Retry). **Restructured later (single-responsibility review):** `ClientsLoader` now owns the query, load states, busy, status line and Retry; `ClientsCard` and the story query helpers are gone; cards take data.
- [x] T4.3 `describeLoadError`: "The request timed out." / "Network error." / "Server error (500)." / "The data was not valid." (non-JSON 2xx only); exactly one `role="alert"` (chart card).
- [x] T4.4 Retry moves focus to the heading first (the button disappears while loading). The heading gets `tabindex=-1` only until focus leaves it, set on the element directly (jsx-a11y: no handlers on a non-interactive element).
- [x] T4.5 `AppErrorBoundary`: "Something went wrong." + Reload.
- [x] Tests: `describeLoadError` unit (9); card stories (10: chart card Loading / Loaded / ServerError / Timeout / NetworkError / InvalidData / UnknownError, table card Loading / Loaded / ServerError), each with a real query result from its own story `QueryClient` (pending / rejected / `initialData` with `staleTime: Infinity`; no network).
- [x] Checked in Chromium on the production build + real API (Playwright request interception for the failures): loaded (1 request, May 301, no alert, not busy); slow load (busy at once, skeletons in both cards, "Loading clients..." only after 1 s, nothing announced after the first load); 0.4 s load never announces loading; 500 -> exactly 2 requests, both cards show "Server error (500).", one alert, in the chart card; Retry (from either card) -> focus on `h1`, skeletons, then "Clients loaded", `h1` not focusable after Tab; network error; non-JSON 200; offline Retry -> loading then "Network error." (no pause); both attempts hanging -> "The request timed out." after 21 s; render crash -> fallback, Reload loads again; axe clean in loading / error / loaded at 375 and 1440 px, no page-level sideways scroll. Known: a 502 with an HTML body shows "The data was not valid." (T1.4 limit).

### Phase 5: Clients table (2 h), core, done

- [x] T5.1 `toTableTree(company)`: one uniform `ClientsTableNode` tree; missing or empty child list -> leaf.
- [x] T5.2 `collapseKeys(expanded, id, tree)`: closing a row also closes its descendants. Plus `nextExpanded(previous, requested, tree)` for RAC's `onExpandedChange` (Right / Left; never expands a leaf) and `toggleExpanded` for clicks / Enter.
- [x] T5.3 `ui/table`: thin wrappers over RAC tree `Table` (`treeColumn`, `expandedKeys`, `onExpandedChange`); `TreeCellContent` (aria-hidden chevron, 28px indent per level, empty slot on leaves so names line up); `TableScroller` (sideways scroll inside the card). Also `ChildRows` (nested rows), `Row` with optional `onAction` (leaves get none), `RowHeaderCell` reading `level` / `hasChildItems` / `isExpanded` from RAC cell render props. `table.css`: sticky edge shadow via CSS scroll timeline (`scroll-timeline: --table-x inline`; no scroll listener; no shadow where unsupported) and the row enter animation via `@starting-style`. `TableScroller` cancels the browser's own Left / Right scroll inside the table (it scrolled 40px on every Right that opened a row); RAC still scrolls a focused cell into view.
- [x] T5.4 `ClientsTable`: month headers via `formatMonth`; advisor rows pass `src={advisorAvatarUrl(id)}` to `Avatar` (photo support done in Phase 3); toggle on click / Enter / Right / Left; Space does nothing; leaf rows: no chevron, no `aria-expanded`, no hover fill, no pointer cursor; avatar on advisor rows; names are row headers, months are column headers.
- [x] T5.5 `ClientsTableSkeleton` with the same layout and height (header + 4 rows): 280 px loaded and loading at 1440 and 375 px.
- [x] T5.6 375px: name column 160px, sticky left with solid background (rows: inherits the row fill, also on hover; header: own fill), edge shadow while scrolled, ellipsis + full name while the row has keyboard focus (`data-focus-visible-within`, wraps by word). Narrow screens use a 12 px indent per level (28 px on desktop, via `--tree-indent`) and 16 px start padding, or level-3 names had ~25 px left ("A.."). Wide screens (after a review note): the name column is as wide as its names, at least 240px and at most 320px of content (cap on the cell's content, since browsers ignore `max-width` on table cells; `width: 1px` so it shrinks to that instead of taking a share of the spare width); 254px for the delivered data at 1440px, no name cut.
- [x] T5.7 FE data checks (decision 11): `features/clients/data-issues.ts` `findDataIssues(tree)` (on the uniform tree) -> sum mismatches (expects the 7 in section 5) and nodes without channels (James, Maria, Robert, Sarah, Branch 2, Branch 3). Header comment: FE for now to ship faster; talk to the BE team to fix the data on the BE. In dev, one `console.warn` per issue after load. In the table, a mismatched cell keeps its stored value and gets a small marker + tooltip "Stored 301, children sum to 279" (sr-only text too). Marker: dot, `title` on hover, the note while the cell has keyboard focus, sr-only text in the cell. Warnings deduplicated per page load (StrictMode runs effects twice); none in production.
- [x] T5.8 _stretch_: enter animation (~300 ms slide/fade, `transform` + `opacity` only, see section 10) only for rows opened by the user; none with reduced motion. Done: only after the first user toggle (`data-animate-new-rows`), opacity + transform 300 ms, none with reduced motion.
- [x] Tests: unit 18 (`table-tree`: mapping, order, stored values, Branch 2 / 3 leaves, only Anna has children, empty list = leaf, `collapseKeys`, `nextExpanded`, `toggleExpanded`; `data-issues`: the 7 mismatches, the 6 missing breakdowns, none on consistent data, one warning per issue). Browser `e2e/table.e2e.ts` (16 tests with the smoke test, real API, `pnpm check:e2e`): start rows and stored values; marker note; open Branch 1 -> 5 advisors, Anna -> 3 channels, close and reopen Branch 1 -> Anna closed; leaf click does nothing, no pointer; advisor photo loads; keyboard (one Tab stop, Right opens, Left to parent then closes, Enter toggles, Space nothing); `treegrid`, `aria-level` 1-4, `aria-expanded` only on the 3 parents, name read once; 375 px (no page scroll, opening a row does not scroll the table, every focused month cell clear of the name column, full name on focus); placeholder height = table height (1440 / 375); axe with rows closed and open (1440 / 375, reduced motion so axe does not measure mid-fade).

### Phase 6: Clients chart (1.75 h), core, done

- [x] T6.1 `toChartSeries({ months, company })`: decision 3. Expected for the delivered data: Feb 250/0/0, Jul 331/2/1, Jan 346/2/2; every bar total equals the Company value. `toChartSeries(company)` + `barTotals`; months are formatted in `ClientsChart`.
- [x] T6.2 `yAxisFor(maxTotal)`: steps of 100, top = next multiple above the highest bar (350 -> 400); `seriesColors`: fixed colour for Existing, palette in order for the rest. Series hex colours are checked against the `--color-series-*` tokens in `index.css` (ECharts cannot resolve CSS variables).
- [x] T6.3 `ui/bar-chart`: ECharts core + SVG renderer, lazy-loaded chunk; stacked bars with 4px rounded outer corners; HTML legend below the plot (not clickable, wraps); tooltip with every series + "Total"; month labels thin out on narrow screens; no animation with reduced motion. Built as `ui/bar-chart` (domain-free) + pure `bar-chart-model.ts` (option builder, month text, tooltip HTML with escaping of names from data, keyboard step). Rounded corners per data item (the plan's fallback, no custom series). Bundle: initial JS 148 kB gzip (react-dom + react-aria); the chart chunk is 178 kB gzip, 98% ECharts + zrender even tree-shaken; its download starts when `clients-chart.tsx` loads, in parallel with the data.
- [x] T6.4 Accessibility: drawing aria-hidden; one focusable wrapper (`role="slider"`, `aria-roledescription="chart"`, `aria-valuetext` = month text); Left/Right/Up/Down/Home/End step months and show the tooltip; Escape hides it; sr-only data table (month x series + Total) after the chart. `aria-valuenow` 1-12, value text in the tooltip's words; keyboard focus (`:focus-visible`) starts at the first month, a click does not; blur ends the session; hover does not change the value.
- [x] T6.5 `ClientsChartSkeleton` (12 bars + legend line, same height). Shares `BAR_CHART_PLOT_HEIGHT` with the chart (from the ECharts-free model file); is also the `Suspense` fallback while the chunk loads.
- [x] T6.6 _stretch_: every non-zero part at least 4px tall (pixels taken from the biggest part). Done: `withMinimumParts` in value units (the inner plot height is fixed, 276 px), so every new-client part is visible; tooltip and data table keep the real numbers.
- [x] Tests: unit 17 `chart-series` (delivered split Feb 250/0/0, Jul 331/2/1, Jan 346/2/2, totals = Company values, stored "Existing clients" channel ignored, extra "Referral", missing "New paid", sum over advisors, new > Company -> Existing 0, no channels at all, `yAxisFor`, colours, tokens) + 30 `bar-chart-model` (stacking, values, colours, axis, outer corners, animation off, minimum part height incl. 8/8/1/1 -> 4/6/4/4 and tiny bar growth, month text, tooltip escaping, keyboard steps). Browser `e2e/chart.e2e.ts` (11): axis 0-400, 12 bars, legend; data table with every total = stored Company value; hover Jul tooltip, value unchanged; Tab shows Feb, arrows / Home / End without wrap, no page scroll; value = tooltip words; Escape keeps the month, leaving resets; 375 px no page scroll and no overlapping labels; placeholder height = chart card height (1440 / 375); axe with the chart focused (1440 / 375). Stories: `ui/bar-chart` Default / SmallParts / ManySeries / Narrow; chart card Loaded now shows the chart.

### Phase 7: Browser tests and accessibility pass (0.75 h), done except the manual screen-reader check

- [x] T7.1 `fixtures.ts`: MSW network fixture (no default handlers -> real API). `e2e/fixtures.ts` (auto fixture, `onUnhandledFrame: 'bypass'`) + `e2e/handlers.ts` (fixed responses only: delivered data or a variant through the generated `getGetClientsMockHandler`, delayed / held / hanging, 500 / 502, non-JSON 200, network error, broken shape; request counters).
- [x] T7.2 Real-API test: Company values on the page (e.g. 301 in May 2024). `e2e/dashboard.e2e.ts` "real API": heading, May 301, chart, not busy, no alert, empty status, exactly 1 request (replaces the scaffold smoke test).
- [x] T7.3 Mocked states: slow load (placeholders, busy, status text after 1 s), 500 twice (error + Retry, 2 requests), non-JSON body, Retry success. Plus: second Retry (failed Retry clears the status), 502, timeout after both attempts hang (2 requests, ~21 s), offline Retry -> network error, no request on focus / reconnect, render crash -> fallback -> Reload, a mocked variant is shown.
- [x] T7.4 axe in loading / error / loaded states, rows closed and open, at 375px and 1440px; no page-level horizontal scroll at 375px. Plus page width: cards 1408 px with 256 / 16 px sides at 1920 / 1440, 343 px with 16 px at 375.
- [x] T7.6 Performance pass, as `e2e/perf.e2e.ts` in Playwright instead of Lighthouse (no extra tool; CPU throttled 4x via CDP as the mid-range phone): initial JS 143 kB gzip (< 200, chart chunk not in it); LCP ~290 ms, CLS 0; slowest interaction per action (Event Timing, INP proxy) < 200 ms: open Branch 1 ~165, open Anna ~96, close ~90, reopen 32, Tab onto chart ~70, 11 chart steps 40 ms. Found and fixed: opening a row took 256 ms (RAC re-renders every visible row) -> the expand state change is a React transition (`startTransition`), so the press paints at once. Not met: "no long task > 50 ms" under 4x throttling (row renders are still 1-2 long tasks of ~60-120 ms; they no longer block the next paint). A forced-layout trace was not automated.
- [ ] T7.5 Manual screen-reader check (VoiceOver + Safari on macOS): table hierarchy, open/close, chart; write results into the README. **Open, for a human** (cannot be automated here). Checklist: Tab onto the table -> "Clients per month, table/treegrid", Company row level 1 expanded; Down / Right / Left read the row name, level and expanded state once (no "AB" initials); a month cell reads row name + month + value; a mismatched cell reads "Stored 301, children sum to 279"; Tab onto the chart -> "Clients per month, Feb 2024 to Jan 2025, chart" + the Feb text; Right reads the next month's text; the data table after the legend reads; on error, the alert is read once; after Retry, "Clients loaded".

### Phase 8: README and polish (0.5 h), done

- [x] T8.1 README: quick start, run/test commands, assumptions (section 6), data issues (section 5), design deviations, table and chart keys, open questions, what next. Also: what the data gets wrong, known limits, test coverage per brief requirement, the build in short.
- [x] T8.2 _stretch_: screenshots (desktop, 375px, open table, error) in `docs/screenshots/`. Done as `pnpm screenshots` (`playwright.screenshots.config.ts` + `e2e/screenshots.shot.ts`, same build and API as the browser tests, reduced motion): desktop, table open, chart from the keyboard, 375px, error. It caught one bug: with reduced motion the chart's axis pointer and tooltip still slid (ECharts animates them apart from `animation`); now `axisPointer.animation` and `transitionDuration` follow it too (unit-tested).
- [x] T8.3 Final `pnpm check` + `pnpm check:e2e`. Both green (see the final run).
- [x] T8.4 Data issue reporting (decision 12): `reporting/report-data-issue.ts` `reportDataIssue({ key, message, details })`, deduplicated by key per page load, `console.warn` in dev, the Sentry call as a TODO; `findDataIssues` results go through `reportDataIssues` (replaces `warnDataIssues`), in every build. Tests: once per key, no console output in production, the 13 reports with their details.
- [ ] T8.5 Set up Sentry and turn the TODO in `reportDataIssue` into the real call, so data issues from production reach the data owner.

## 8. Priorities if time runs out

1. Table with expand/collapse that works with keyboard and screen reader (R5, R8).
2. Chart with the correct data mapping (`toChartSeries` + tests) (R6).
3. Loading and error states with Retry (R3).
4. Unit tests for both mappings + e2e for expand/collapse (R6).
5. 375px layout (R7) and README (R9).
6. Everything marked _stretch_, chart keyboard stepping, screenshots.

## 9. Testing strategy

| Level      | Tool                                   | What                                                                                                                                                                      |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit       | Vitest                                 | pure logic: `toTableTree`, `collapseKeys`, `toChartSeries`, `yAxisFor`, `formatMonth`, `describeLoadError`, avatar helpers, `findDataIssues`, API routes, request timeout |
| Components | Storybook + a11y addon (`test: error`) | every `ui/` component (props only) and both cards in every load state                                                                                                     |
| Browser    | Playwright + `@msw/playwright` + axe   | real API smoke, mocked load states, expand/collapse by mouse and keyboard, ARIA tree, chart tooltip and keys, 375px                                                       |

`pnpm check` = ESLint (0 warnings) + Prettier check + typecheck in all packages + unit tests. `pnpm check:e2e` builds the web app, starts API + preview on fixed ports and runs Playwright (not part of `pnpm check`).

## 10. Performance

Targets (production build, mid-range phone, Lighthouse mobile): LCP < 2.5 s, CLS < 0.1, INP < 200 ms, no long task > 50 ms after load, initial JS < 200 kB gzip.

Rendering (keep work on the GPU compositor):

- **Animate only `transform` and `opacity`** (row enter animation, skeleton pulse, chevron rotation, tooltip). Never animate `height`, `width`, `top`, `left`, `margin` or `box-shadow`: they trigger layout or paint on every frame.
- **`will-change` only while animating** (set it on the animating rows, remove it after), not permanently: each promoted layer costs GPU memory.
- **Sticky name column** uses `position: sticky` (compositor-handled). Its edge shadow is a pseudo-element whose `opacity` is toggled (via CSS scroll-driven animation `animation-timeline: scroll(inline)`, or an `IntersectionObserver` sentinel as fallback), not a `scroll` listener that writes styles.
- **No layout thrash**: never read layout (`getBoundingClientRect`, `offsetWidth`) and write styles in the same frame; chart size comes from one `ResizeObserver`, batched in `requestAnimationFrame`.
- **CSS containment**: `contain: layout paint` on each card, so a tooltip or row change in one card does not relayout the page.
- **Reduced motion**: all animation off under `prefers-reduced-motion: reduce`.

Layout stability (CLS):

- Skeletons have the exact height of the loaded content (chart plot + legend; table header + 4 rows), so the switch from pending to success moves nothing.
- Font: `@fontsource-variable/inter` with `font-display: swap`, latin subset only, preloaded `woff2`; tabular numbers so values don't shift width.
- Avatars and icons have fixed sizes in CSS.

JavaScript and React:

- **ECharts tree-shaken** (`echarts/core` + `BarChart`, grid, tooltip, SVG renderer only) and **lazy-loaded** (`React.lazy` for `ClientsChart`; the skeleton is the `Suspense` fallback). The table does not wait for the chart chunk.
- SVG renderer: 36 bars is few elements; it stays sharp and needs no canvas re-raster on resize.
- Pure mappings (`toTableTree`, `toChartSeries`, `yAxisFor`) run once per `query.data` (`useMemo` keyed on the data); ECharts `option` is stable between renders, so `echarts-for-react` does not call `setOption` again on unrelated re-renders.
- Chart keyboard stepping and tooltip use `dispatchAction` (no React state per hover/keypress, no re-render of the chart).
- Expand/collapse renders only the visible rows (RAC tree `Table` with `expandedKeys`); collapsed subtrees are not in the DOM.
- One request (`staleTime: Infinity`, no focus refetch); the fixture response gets `Cache-Control` and gzip in the API.
- Advisor photos: 64x64 JPEG (2.4 kB each), cached a day, loaded lazily only for visible advisor rows (Branch 1 open). In production: from a CDN.
- Lucide icons imported one by one (named imports, tree-shaken).
- No date library: month labels use the native `Intl.DateTimeFormat` (one cached instance). Add `date-fns` only if date handling grows beyond formatting.

Checks: `pnpm build` prints chunk sizes (budget above); Lighthouse mobile run and a Chrome Performance trace (expand Branch 1 + Anna, step the chart with the keyboard) before Phase 8; results go into the README.

## 11. Risks and open items

- **Figma not readable from this session.** Visual values (colours, spacing, radius, font sizes) are provisional. Check them against the Figma in Phase 3.
- **Node 26 is required** (`.nvmrc`). Run `nvm install` and `npm i -g pnpm@12` once (Node 26 does not ship corepack).
- **RAC tree table**: `treeColumn` / `expandedKeys` on `Table` is newer API. If it misbehaves, fall back to a hand-written `role="treegrid"` table with roving `tabIndex`.
- **ECharts rounded stacked bars**: the per-stack rounded outline needs a custom series. Fallback: standard stacked `bar` with `borderRadius` on the top/bottom visible part.
- **Data issue reports go nowhere in production yet**: the Sentry call in `reportDataIssue` is a TODO (decision 12, T8.5); until then only the dev console shows them.
- **Data discrepancies belong to the BE**: the checks are on the FE only to ship faster (decision 11). Raise the 7 mismatches with the BE team / data owner and move the checks to the BE once they own them.
- **Open question for the product owner**: should "no channel recorded" be an explicit channel? It decides what "Existing clients" means in the chart (decision 3).
