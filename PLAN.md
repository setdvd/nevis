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
      └─ DashboardPage                   owns query, retry focus, sr status line
         ├─ ChartCard  { query, onRetry }   switch (query.status)
         │    ├─ ClientsChartSkeleton
         │    ├─ LoadError (role=alert, the only alert on the page)
         │    └─ ClientsChart { months, company }
         │         └─ ui/BarChart { categories, series, yAxis, labels }  (+ Legend, + sr-only data table)
         └─ TableCard  { query, onRetry }
              ├─ ClientsTableSkeleton
              ├─ LoadError
              └─ ClientsTable { months, company }
                   └─ ui/Table (RAC treegrid): Table, TableHeader, Column, TableBody, Row, Cell, RowHeaderCell, TreeCellContent
```

Key types and component APIs (draft):

```ts
// features/clients: load state is the TanStack Query result type, no own wrapper
import type { UseQueryResult } from '@tanstack/react-query'

type CardProps = {
    query: UseQueryResult<ClientsResponse, Error> // switch (query.status): 'pending' | 'error' | 'success'
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
    │   └── src/
    │       ├── index.ts       (P0)  boot, serve :8787
    │       ├── app.ts               createApp(response): GET /clients, 404, 500
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
            ├── app/
            │   ├── providers.tsx          QueryClient defaults
            │   ├── dashboard-page.tsx     heading, cards, aria-busy, status line, retry
            │   ├── app-error-boundary.tsx
            │   └── use-delayed-flag.ts    "Loading clients..." only after 1 s
            ├── features/clients/
            │   ├── describe-load-error.ts (+test)   timeout / network / server (status) / invalid data
            │   ├── data-issues.ts (+test)          findDataIssues: sum mismatches, missing channels (FE for now, see decision 11)
            │   ├── chart-card/chart-card.tsx (+stories)
            │   ├── table-card/table-card.tsx (+stories)
            │   ├── clients-chart/
            │   │   ├── clients-chart.tsx (+stories)
            │   │   ├── clients-chart-skeleton.tsx
            │   │   └── chart-series.ts (+test)      company -> series (THE data-to-chart mapping)
            │   └── clients-table/
            │       ├── clients-table.tsx (+stories)
            │       ├── clients-table-skeleton.tsx
            │       └── table-tree.ts (+test)        company -> uniform tree, collapseKeys
            └── ui/                  one folder per component, each with *.stories.tsx
                ├── avatar/          initials + tint from seed (+ helpers test)
                ├── bar-chart/       ECharts stacked bars, legend, sr data table, keyboard stepping
                ├── button/
                ├── card/            white surface, region named by an sr-only h2
                ├── load-error/      message + Retry, role=alert opt-in
                ├── skeleton/        aria-hidden, motion-safe pulse
                └── table/           RAC tree table wrappers, sticky name column, chevron
```

Conventions: kebab-case file names, one folder per component, named exports only (no default exports, lint rule), `type` instead of `interface`, alphabetized imports, no import cycles, colocated tests (`*.test.ts`) and stories (`*.stories.tsx`).

- **Load state uses TanStack Query types only** (`UseQueryResult`, `query.status`, `query.data`, `query.error`). No own wrapper type such as `Loadable`.
- **No `notReachable` / `assertNever` helpers.** A `switch` over a union lists every case and has no `default`; `@typescript-eslint/switch-exhaustiveness-check` reports a missing case.

## 5. Data contract

`GET /clients` returns `{ months, company }`:

- `months`: exactly 12 strings `YYYY-MM`. The payload has no dates, so the API adds `2024-02` .. `2025-01` (the period stated in the brief). The UI formats them; it never hardcodes month names.
- `company`: Company (`branches` required) > Branch (`employees` optional) > Advisor (`channels` optional) > AcquisitionChannel.
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

Decision: show stored values unchanged. The checks run on the FE (decision 11): `findDataIssues` finds them, logs a `console.warn` per issue in dev, and the table marks each affected cell; the README lists them. **Talk to the BE team** so the discrepancies get fixed at the source; doing it on the FE is only to ship faster.

## 6. Decisions and assumptions (to be confirmed, then moved to README)

1. **API serves the data unchanged.** No totals are corrected and no levels are filled in. Fixing data is the data owner's call.
2. **Table shows stored values** for every row, never sums of children.
3. **Chart = whole company, stacked by acquisition channel** (legend: Existing clients, New organic, New paid, as in the design). Only Anna has channels, so summing channels would give about 25 instead of 250. Therefore "Existing clients" = Company value minus all other channels (never below 0), so each bar reaches the Company total. Any other channel name found in the data becomes its own series, in the order found. This is a guess; it is an open question for the product owner.
4. **Start state**: Company row open, all other rows closed.
5. **Rows without children** have no chevron and no expanded state, and do nothing on click or Enter. (Check the Figma: if it shows chevrons on every row, this is a deliberate deviation.)
6. **Closing a row closes its open descendants**, so reopening shows children closed.
7. **Advisors show an initials avatar**; the data has no photos.
8. **Request policy**: one automatic retry after 500 ms, 10 s timeout per attempt, no refetch on window focus or reconnect.
9. **When the design and the data disagree, the data wins.**
10. **No runtime schema validation anywhere (types only).** API and web client trust the OpenAPI contract and use the orval-generated TS types; no zod. The data is a static, typed fixture, so the compiler already guarantees its shape; runtime checks would only repeat that and add bundle size. Value rules the types cannot express (12 values, integers >= 0, UUIDs) are documented in `openapi.yaml`, not enforced.
11. **Data checks live on the FE for now.** This is an FE-oriented task, so the BE stays a thin "serve the data as is" layer and is barely touched. The FE detects sum mismatches and missing channels (`findDataIssues`), shows stored values unchanged, and marks the mismatches. The right long-term owner is the BE / data owner: **we should talk to the BE team to fix the discrepancies on the BE**; we do it on the FE only to ship faster. Code comments at both places say so.

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
- [x] Tests (8) via `app.request()`: data unchanged (May 301), 304 on ETag, gzip, request log line, 404 route and method, 500 with the message only in the log. Playwright now waits for `http://localhost:8787/clients`.

### Phase 3: UI foundation (0.5 h)

- [ ] T3.1 Design tokens in `index.css` (`@theme`): page `#F7F5ED`, ink `#141413`, series `#B29DF8` / `#F4BEB4` / `#A75E6E`, card radius 8px, content max width 1408px, heading 35px; Inter Variable; tabular numbers. Verify each value against the Figma.
- [ ] T3.2 `ui/` components with stories: `Card` (region + sr-only `h2`), `Button` (RAC), `Skeleton` (aria-hidden, pulse only without reduced motion), `LoadError` (message + Retry, `role="alert"` opt-in), `Avatar` (initials, tint chosen from the id, aria-hidden, contrast >= 4.5:1).
- [ ] Tests: avatar initials and tint helpers. Then drop `--passWithNoTests` from the `frontend` test script.

### Phase 4: Dashboard shell and load states (0.75 h)

- [ ] T4.1 `Providers`: QueryClient defaults from decision 8 (`staleTime: Infinity`, `retry: 1`, `retryDelay: 500`, `networkMode: 'always'`).
- [ ] T4.2 `DashboardPage`: `h1` "Clients"; `ChartCard` + `TableCard` get `query` (`UseQueryResult<ClientsResponse, Error>` from `useGetClients`) + `onRetry`; card area `aria-busy` while pending; sr-only status line after the cards ("Loading clients..." after 1 s; "Clients loaded" after a successful Retry).
- [ ] T4.3 `describeLoadError`: "The request timed out." / "Network error." / "Server error (500)." / "The data was not valid." (non-JSON 2xx only); exactly one `role="alert"` (chart card).
- [ ] T4.4 Retry moves focus to the heading first (the button disappears while loading).
- [ ] T4.5 `AppErrorBoundary`: "Something went wrong." + Reload.
- [ ] Tests: `describeLoadError` unit; card stories for Loading / Failed / Loaded, each getting a real query result from a story `QueryClient` (pending / rejected / `initialData`; no network).

### Phase 5: Clients table (2 h), core

- [ ] T5.1 `toTableTree(company)`: one uniform `ClientsTableNode` tree; missing or empty child list -> leaf.
- [ ] T5.2 `collapseKeys(expanded, id, tree)`: closing a row also closes its descendants.
- [ ] T5.3 `ui/table`: thin wrappers over RAC tree `Table` (`treeColumn`, `expandedKeys`, `onExpandedChange`); `TreeCellContent` (aria-hidden chevron, 28px indent per level, empty slot on leaves so names line up); `TableScroller` (sideways scroll inside the card).
- [ ] T5.4 `ClientsTable`: month headers via `formatMonth`; toggle on click / Enter / Right / Left; Space does nothing; leaf rows: no chevron, no `aria-expanded`, no hover fill, no pointer cursor; avatar on advisor rows; names are row headers, months are column headers.
- [ ] T5.5 `ClientsTableSkeleton` with the same layout and height (header + 4 rows).
- [ ] T5.6 375px: name column 160px, sticky left with solid background, edge shadow while scrolled, ellipsis + full name while the row has focus.
- [ ] T5.7 FE data checks (decision 11): `features/clients/data-issues.ts` `findDataIssues(company)` -> sum mismatches (expects the 7 in section 5) and nodes without channels (James, Maria, Robert, Sarah, Branch 2, Branch 3). Header comment: FE for now to ship faster; talk to the BE team to fix the data on the BE. In dev, one `console.warn` per issue after load. In the table, a mismatched cell keeps its stored value and gets a small marker + tooltip "Stored 301, children sum to 279" (sr-only text too).
- [ ] T5.8 _stretch_: enter animation (~300 ms slide/fade, `transform` + `opacity` only, see section 10) only for rows opened by the user; none with reduced motion.
- [ ] Tests: `table-tree` unit (mapping, Branch 2/3 leaves, only Anna has children, `collapseKeys`); e2e: start shows 4 rows; open Branch 1 -> 5 advisors; open Anna -> 3 channels; close and reopen Branch 1 -> Anna closed; keyboard Right/Down/Left; `role=treegrid`, `aria-level` 1-4, `aria-expanded` only on parents; axe.

### Phase 6: Clients chart (1.75 h), core

- [ ] T6.1 `toChartSeries({ months, company })`: decision 3. Expected for the delivered data: Feb 250/0/0, Jul 331/2/1, Jan 346/2/2; every bar total equals the Company value.
- [ ] T6.2 `yAxisFor(maxTotal)`: steps of 100, top = next multiple above the highest bar (350 -> 400); `seriesColors`: fixed colour for Existing, palette in order for the rest.
- [ ] T6.3 `ui/bar-chart`: ECharts core + SVG renderer, lazy-loaded chunk; stacked bars with 4px rounded outer corners; HTML legend below the plot (not clickable, wraps); tooltip with every series + "Total"; month labels thin out on narrow screens; no animation with reduced motion.
- [ ] T6.4 Accessibility: drawing aria-hidden; one focusable wrapper (`role="slider"`, `aria-roledescription="chart"`, `aria-valuetext` = month text); Left/Right/Up/Down/Home/End step months and show the tooltip; Escape hides it; sr-only data table (month x series + Total) after the chart.
- [ ] T6.5 `ClientsChartSkeleton` (12 bars + legend line, same height).
- [ ] T6.6 _stretch_: every non-zero part at least 4px tall (pixels taken from the biggest part).
- [ ] Tests: `chart-series` unit (delivered data, extra channel "Referral", missing "New paid", channels above Company value -> Existing 0); `yAxisFor`; keyboard step helper; e2e: 12 bars, tooltip for Jul 2024, keyboard stepping, 375px no overlap.

### Phase 7: Browser tests and accessibility pass (0.75 h)

- [ ] T7.1 `fixtures.ts`: MSW network fixture (no default handlers -> real API).
- [ ] T7.2 Real-API test: Company values on the page (e.g. 301 in May 2024).
- [ ] T7.3 Mocked states: slow load (placeholders, busy, status text after 1 s), 500 twice (error + Retry, 2 requests), non-JSON body, Retry success.
- [ ] T7.4 axe in loading / error / loaded states, rows closed and open, at 375px and 1440px; no page-level horizontal scroll at 375px.
- [ ] T7.6 Performance pass (section 10): bundle budget, Lighthouse mobile (LCP / CLS / INP), Performance trace without forced layouts or long tasks during expand/collapse and chart stepping.
- [ ] T7.5 Manual screen-reader check (VoiceOver + Safari on macOS): table hierarchy, open/close, chart; write results into the README.

### Phase 8: README and polish (0.5 h)

- [ ] T8.1 README: quick start, run/test commands, assumptions (section 6), data issues (section 5), design deviations, table and chart keys, open questions, what next.
- [ ] T8.2 _stretch_: screenshots (desktop, 375px, open table, error) in `docs/screenshots/`.
- [ ] T8.3 Final `pnpm check` + `pnpm check:e2e`.

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
- Lucide icons imported one by one (named imports, tree-shaken).
- No date library: month labels use the native `Intl.DateTimeFormat` (one cached instance). Add `date-fns` only if date handling grows beyond formatting.

Checks: `pnpm build` prints chunk sizes (budget above); Lighthouse mobile run and a Chrome Performance trace (expand Branch 1 + Anna, step the chart with the keyboard) before Phase 8; results go into the README.

## 11. Risks and open items

- **Figma not readable from this session.** Visual values (colours, spacing, radius, font sizes) are provisional. Check them against the Figma in Phase 3.
- **Node 26 is required** (`.nvmrc`). Run `nvm install` and `npm i -g pnpm@12` once (Node 26 does not ship corepack).
- **RAC tree table**: `treeColumn` / `expandedKeys` on `Table` is newer API. If it misbehaves, fall back to a hand-written `role="treegrid"` table with roving `tabIndex`.
- **ECharts rounded stacked bars**: the per-stack rounded outline needs a custom series. Fallback: standard stacked `bar` with `borderRadius` on the top/bottom visible part.
- **Data discrepancies belong to the BE**: the checks are on the FE only to ship faster (decision 11). Raise the 7 mismatches with the BE team / data owner and move the checks to the BE once they own them.
- **Open question for the product owner**: should "no channel recorded" be an explicit channel? It decides what "Existing clients" means in the chart (decision 3).
