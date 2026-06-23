# calgrok

A fast, month-view content calendar backed live by the [Linear](https://linear.app)
API. No Linear data is stored — everything is pulled on demand and cached
in-session. Drag-and-drop to reschedule an issue's `dueDate` (treated as the
publish date).

See [`PLAN.md`](./PLAN.md) for the full design, decisions, and milestones.

## Stack

- **React Router 7** (framework mode, SSR) — the Node server also handles the
  Linear OAuth token exchange and the BFF proxy.
- **[@ngrok/mantle](https://mantle.ngrok.com)** — UI + design tokens (Tailwind v4).
- **TanStack Query** — in-memory cache + optimistic updates.
- **Vitest + Testing Library** — tests alongside source.
- **Biome** — format + lint.

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in once the Linear OAuth app exists (milestone 2)
pnpm dev               # http://localhost:3000
```

## Scripts

| command           | what it does                          |
| ----------------- | ------------------------------------- |
| `pnpm dev`        | dev server on :3000                   |
| `pnpm build`      | production build                      |
| `pnpm start`      | serve the production build            |
| `pnpm typecheck`  | generate route types + `tsc`          |
| `pnpm test`       | run tests once                        |
| `pnpm test:watch` | watch mode                            |
| `pnpm fmt`        | format with Biome                     |
| `pnpm lint`       | lint with Biome                       |
