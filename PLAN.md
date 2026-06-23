# calgrok — Linear Content Calendar

A fast, month-view content calendar backed live by the Linear API. No data is
stored from Linear; everything is pulled on demand and cached in-session. The
calendar's primary unit is a Linear **issue placed by its `dueDate`** (= publish
date), with drag-and-drop to reschedule.

This replaces "LinCal," which was slow and froze browser tabs. Performance is the
reason for the rebuild, so the data-fetching and rendering strategy below is the
core of the design — not a polish step.

## Product decisions (locked)

- **Auth:** OAuth, multi-user (people log in with their own Linear accounts).
- **Calendar unit:** issues, placed by `dueDate` (treated as publish date).
- **Views:** month only (for now).
- **Color coding:** by issue **status** (Linear workflow state color).
- **Writes:** edit only — drag-and-drop to change `dueDate`. No issue creation.
- **Filters:** by team (default GTM + Content), by label.
- **Custom views:** saved in `localStorage`.

## Card contents

Each issue card shows:

- Title
- Assignee avatar
- Status indicator (color = Linear workflow state color)
- Label color dot(s)
- Two actions: **open issue** (`issue.url`) and **open parent project**
  (`project.url`) in new tabs

## Stack

Follows ngrok frontend conventions (`@ngrok/mantle`, React Router 7, TanStack
Query, Tailwind + CVA, Vitest + Testing Library).

- **React Router 7 (framework mode)** — gives us a Node server for the OAuth
  token exchange and the Linear BFF proxy. Standalone app in this repo,
  consuming `@ngrok/mantle`.
- **`@ngrok/mantle`** — UI components, design tokens, `cx`. No raw Tailwind
  colors; use semantic tokens.
- **`@linear/sdk`** — typed wrapper over Linear's GraphQL (used server-side in
  the proxy).
- **TanStack Query** — in-memory cache, optimistic mutations, adjacent-month
  prefetch. This is the antidote to LinCal's clunkiness.
- **`@dnd-kit`** — drag-and-drop over a custom month grid (chosen over
  FullCalendar for render control / smaller bundle).
- **Vitest + Testing Library** — tests alongside source.

> Convention note: the frontend skill's data-fetching examples assume
> Connect-RPC against ngrok services. We keep the *patterns* (feature
> `queries.tsx`, `queryKeys` factory, optimistic updates) but the `queryFn`
> hits our Linear BFF proxy, not a Connect client. Connect-specific error
> handling does not apply; we handle GraphQL/SDK + HTTP 401 instead.

## Architecture

### Auth (OAuth, server-side)

1. `/auth/linear` → redirect to Linear authorize URL
   (`client_id`, `redirect_uri`, `scope=read,write`, `state`).
2. `/auth/linear/callback` (server action) → exchange `code` + **client secret**
   (server-only) for an **access token + refresh token** → store both (plus
   expiry) in an **httpOnly, secure, encrypted session cookie** → redirect into
   the app.
3. **Token refresh:** Linear access tokens expire after **24 hours** and return
   a refresh token. The BFF refreshes server-side when the token is expired or
   near-expiry, transparently to the browser. On a hard `401` (refresh failed /
   revoked), bounce the user back through `/auth/linear`.

> Cookie note: the session cookie is **signed** (HMAC via `SESSION_SECRET`) and
> `httpOnly` + `secure`, not encrypted. httpOnly keeps the tokens unreadable by
> client JS; signing prevents tampering. Encryption-at-rest in the cookie could
> be added later if desired.

Scopes: `read`, `write` (write needed to update `dueDate`). No `issues:create`.

**OAuth app ownership:** create a dedicated Linear workspace to own the app
(Linear's recommended pattern), mark it **public** so ngrok-workspace users can
authorize against their own workspace. Register both redirect URIs up front:
`http://localhost:3000/auth/linear/callback` (dev) and the ngrok Ship URL's
callback (prod).

Secrets live in server env only: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`,
`SESSION_SECRET`, `LINEAR_REDIRECT_URI`.

### Linear access (BFF proxy)

- Browser → `POST /api/linear` (our server) → server reads token from cookie →
  forwards GraphQL to Linear via `@linear/sdk` → returns result.
- Token never reaches the browser. No DB; cookie is the only token store.

### Data fetching & performance (the core)

The fixes for LinCal's freezing:

1. **Scope every query** to the selected teams **and** the visible date window.
   Linear filter: `{ dueDate: { gte, lte }, team: { id: { in: [...] } } }`
   where the window is the visible 6-week grid (month ± leading/trailing days).
2. **Paginate** through Linear results (page size up to 250) until exhausted.
   A month of content issues is small (<~100), so this is cheap.
3. **Cache** with TanStack Query, keyed by
   `['issues', teamIds, labelIds, monthStart]`. Prefetch previous/next month on
   idle for instant navigation.
4. **Bounded rendering** — a fixed 42-cell (6×7) grid; cells and cards are
   `memo`-ized. No virtualization needed because per-month volume is bounded.
5. **Optimistic drag** — on drop, `setQueryData` moves the issue to the new date
   immediately, then fire the `issueUpdate` mutation; roll back on error.

### Drag-and-drop reschedule

- `@dnd-kit`: cards are draggable, day cells are drop targets.
- `onDragEnd` → optimistic cache update → `issueUpdate({ id, dueDate })` →
  invalidate affected month query; rollback + toast on failure.

### Custom views (localStorage)

A view is a named bundle of filter state. Stored as a single versioned JSON
array under one key so the shape can migrate without breaking saved views.

```ts
type SavedView = {
  id: string;
  name: string;
  teamIds: string[];
  labelIds: string[];
  // colorBy is "status" for now; field reserved for future options
  colorBy: "status";
};

type ViewStore = { version: 1; views: SavedView[] };
```

Default view: GTM + Content teams, no label filter.

### Team scope

Hardcoded default via a config constant `DEFAULT_TEAM_KEYS = ["GTM", "Content"]`,
resolved to opaque team IDs once at startup (match by team name/key). The data
model carries `teamIds: string[]` throughout, so adding teams later is a
one-line config change or a team picker — no schema/migration impact.

## Proposed structure

```
app/
├── api.server/          # Linear SDK client, OAuth token exchange, session cookie
├── api.client/          # browser fetch wrapper to /api/linear
├── features/
│   └── calendar/
│       ├── queries.tsx  # queryKeys factory + useIssues / useUpdateDueDate
│       ├── month-grid.tsx
│       ├── day-cell.tsx
│       ├── issue-card.tsx
│       └── ...
├── components/          # app-specific shared UI
├── hooks/               # useSavedViews, etc.
├── routes/
│   ├── _index.tsx           # the calendar
│   ├── auth.linear.tsx      # start OAuth
│   ├── auth.linear.callback.tsx
│   └── api.linear.tsx       # BFF proxy
├── utilities/
├── root.tsx
└── routes.ts
```

## Build order (milestones)

1. ✅ **Scaffold** — RR7 framework app + mantle + TanStack Query + Tailwind/CVA;
   typecheck/test/fmt wired.
2. ✅ **Auth** — OAuth start/callback, signed httpOnly session cookie, token
   refresh, logout/revoke, `whoami` (viewer shown on the home page). The
   authenticated `getLinearAuth(request)` helper is the basis for the BFF
   resource routes in milestone 3.
3. ✅ **Read calendar** — month grid (Mon-start, prev/next/today + adjacent-month
   prefetch), single batched + paginated issue query scoped to teams + visible
   window (BFF resource route `/api/issues`), status-colored cards with
   assignee, label dots, and issue/project links. Teams hardcoded: GTM
   (`eab6f126…`) + Content (`4610eaa2…`).
4. ✅ **Filters** — team toggles (default GTM+Content; all-off → empty) and a
   label multi-select popover (`/api/labels`). Filter state lifted to a
   `useCalendarFilters` hook, ready to be backed by saved views in milestone 6.
5. **Drag-and-drop reschedule** — optimistic `issueUpdate`.
6. **Custom views** — localStorage CRUD, view switcher.
7. **Polish & perf pass** — adjacent-month prefetch, memoization audit, empty/
   loading/error states, toasts.

## Resolved decisions

1. **OAuth app** — Joel creates a dedicated personal Linear workspace, makes the
   app there, marks it public. (Verify the public toggle exists at creation;
   fallback is creating it in the ngrok workspace.)
2. **Hosting** — localhost:3000 for dev now; ngrok Ship for prod later. Both
   redirect URIs registered up front.
3. **Token storage** — secure BFF proxy; tokens (access + refresh) stay in an
   httpOnly session cookie, never in the browser.
4. **Team scope** — hardcode GTM + Content as the default via config constant;
   data model stays flexible.

## Prereqs before milestone 1

- [ ] Linear OAuth app created; `client_id`, `client_secret`, redirect URIs set.
- [ ] Confirm GTM and Content team names/keys as they appear in Linear.
