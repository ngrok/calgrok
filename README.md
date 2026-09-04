<p align="center">
  <img src="public/icon-512.png" width="88" height="88" alt="The Slated mark: a calendar tile with one day filled in.">
</p>

<h1 align="center">Slated</h1>

<p align="center">
  Everything your team has slated to ship, on one calendar.
</p>

<p align="center">
  <a href="https://github.com/ngrok/slated/actions/workflows/ci.yml"><img src="https://github.com/ngrok/slated/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>

---

Your content plan already lives in [Linear](https://linear.app), with due dates,
labels, and assignees on every issue. What Linear won't give you is a month grid
to look at it on.

Slated is that grid. It reads your issues straight from the Linear API, places
each one on the day it's due, and moves it when you drag it somewhere else. It
stores nothing of its own, so Linear stays the single source of truth and there's
no second system to keep in sync.

<!--
  TODO: add the lead screenshot at docs/screenshot.png, then uncomment.
  Run `pnpm demo` and capture the month grid at http://localhost:3100 at 1440px
  wide. No API key needed, and the fake workspace it generates is the same one
  every time.
  <p align="center">
    <img src="docs/screenshot.png" alt="The Slated month grid, with issue cards placed on their due dates.">
  </p>
-->

## What you get

Slated:

- Places every Linear issue on a month calendar by its due date, which it treats
  as the publish date.
- Puts your Linear projects on the same grid, by their target date. Projects
  show by default and turn off under **Options**.
- Reschedules an issue or a project the moment you drop it on another day. The
  card moves first and rolls back if Linear rejects the write.
- Opens any issue in a modal to read its description and edit the due date or
  tags, including clearing the date to drop it off the calendar.
- Creates issues without leaving the calendar. Hover a day and hit `+`, then set
  a title, team, due date, status, priority, and tags.
- Discovers your teams from Linear, and filters by team and label.
- Keeps the rest behind one **Options** menu: the view toggles, the theme, and a
  manual sync. Your view and theme persist between visits, and the theme follows
  your system setting until you pick one.

## Quickstart

You need [Node](https://nodejs.org) 20 or newer,
[pnpm](https://pnpm.io/installation), and a personal Linear API key from
[linear.app/settings/api](https://linear.app/settings/api).

```bash
git clone https://github.com/ngrok/slated.git
cd slated
pnpm install
pnpm setup:env    # asks for your API key, writes .env (not `pnpm setup`)
pnpm dev          # http://localhost:3000
```

Reload the page once on your first run. Vite optimizes dependencies during that
first load, and until it finishes the page renders but its buttons do nothing.

That's the whole setup. One variable, no OAuth app, no callback URL to register:

```
LINEAR_API_KEY=lin_api_...
```

There's no sign-in screen. Slated acts as the key's owner and loads the calendar
straight away.

> [!WARNING]
> **Slated has no access control of its own.** Everyone who can reach the server
> holds your Linear read and write access, and every issue they create or
> reschedule is attributed to you. Keep it on `localhost`, or put authentication
> in front of it before anyone else can reach it — see [Deploying](#deploying).

> [!NOTE]
> **Your workspace may not allow this.** Linear admins decide whether members can
> create personal API keys, under **Settings > Administration > API**. If that
> page won't issue you one, that's why, and you'll need an admin to turn them
> back on.

### See it without Linear

To look before you make a key, `pnpm demo` runs the real calendar against a
generated workspace: invented teams, projects, and a few months of content work
that never existed.

```bash
pnpm install
pnpm demo         # http://localhost:3100
```

It needs no `.env` and reaches no API. Everything works, drag to reschedule and
the new-issue dialog included, and those edits live in memory until you stop the
server. The port is 3100 so a demo can't collide with a real instance on 3000.

The generated calendar is deterministic and anchored on today, so the same day
always holds the same cards and the past always reads as shipped. That's what
makes it worth screenshotting.

## Configuration

Every value goes in `.env` (see [`.env.example`](./.env.example)).

| Variable | Required | What it does |
| --- | --- | --- |
| `LINEAR_API_KEY` | Yes | A personal API key from [linear.app/settings/api](https://linear.app/settings/api). Slated acts as its owner, and the key stays server-side. |
| `LINEAR_TEAM_DEFAULT` | No | Comma-separated team keys (for example, `GTM,CON`) preselected on a visitor's first load. |
| `LINEAR_LABEL_NAMESPACE` | No | When set (for example, `con/`), scopes the calendar to labels under that prefix and strips it in the UI. |
| `LINEAR_PROJECT_LABEL` | No | The project label (for example, `Content`) that decides which projects reach the calendar. Comma-separated for several. |
| `SLATED_DEMO` | No | Set to `1` to serve the generated demo calendar instead of Linear. No API key needed, and no Linear request is made. |

Slated reads these variables once, when the server starts. Restart it after you
change `.env`, or the running server keeps the old values: a stale
`LINEAR_PROJECT_LABEL` shows a calendar with no projects on it and reports
nothing. The **Options** menu names the label it is filtering on, so you can see
which value the server actually holds.

### Adapting it to your workspace

Slated discovers your Linear teams and **fetches nothing until you select at
least one**, so an empty calendar on first load usually means no team is picked
yet. `LINEAR_TEAM_DEFAULT` seeds that selection, and every team stays available
to toggle.

Leave `LINEAR_LABEL_NAMESPACE` blank and labels are just optional filters. Set it
to `con/` and only those labels are offered, with the prefix stripped in the UI
and unfiltered views scoped to issues carrying one.

Projects are filtered the same way, first by the selected teams and then by
`LINEAR_PROJECT_LABEL`. Project labels are workspace-level in Linear rather than
per-team, so this one is a plain name: set it to `Content` and only projects
carrying that label appear. Leave it blank and every project the selected teams
can see is offered. The issue label filter in the header does not narrow
projects, because the two label sets are separate in Linear.

## Deploying

Slated has no sign-in of its own, so anything other people can reach needs
access control in front of it. Without one, every visitor holds your Linear read
and write access.

A container image is published for every commit on `main`, so there's nothing to
build:

```bash
docker run --rm -p 3000:3000 --env-file .env ghcr.io/ngrok/slated:latest
```

Use `ghcr.io/ngrok/slated:sha-<commit>` to pin an exact build. Or build it
yourself, and supply the same environment variables at runtime:

```bash
docker build -t slated .
docker run --rm -p 3000:3000 --env-file .env slated
```

Bind it to `localhost` and leave it there, or front it with something that
authenticates visitors. Slated itself serves the calendar to whoever asks.

## How it works

Slated is a [React Router](https://reactrouter.com) app that talks to Linear
from the server. The API key lives only in the server's environment and every
Linear request is proxied, so the key never reaches the browser. There's no
database: the server is a thin proxy in front of Linear, and the browser caches
what it fetches for the session with
[TanStack Query](https://tanstack.com/query). The UI uses
[mantle](https://mantle.ngrok.com), ngrok's design system.

[`docs/design.md`](./docs/design.md) is the original design doc and build log,
including the performance work that was the whole reason for the rebuild. It
describes a multi-user OAuth flow, which Slated no longer has.

## Why we built it

We plan a lot of content at ngrok, and our issues already lived in Linear with
due dates, labels, and assignees. The calendar we'd been using on top of them was
slow, and it froze the browser tab often enough that people stopped opening it.
Slated is the rebuild. Performance drove the design rather than arriving as a
polish step, which is why the data-fetching strategy in
[`docs/design.md`](./docs/design.md) reads like the core of the project.

It's built for how ngrok's GTM and Content teams work. It's configurable enough
to run against another Linear workspace.

## Development

```bash
pnpm dev          # dev server on :3000
pnpm demo         # generated demo calendar on :3100, no API key
pnpm test         # vitest
pnpm typecheck    # react-router typegen + tsc
pnpm lint         # biome
pnpm fmt          # biome, writing fixes
pnpm build        # production build
```

CI runs lint, typecheck, tests, and the build on every pull request.

## Repo layout

```
.
├── app/
│   ├── routes/        The calendar page and the API routes that proxy Linear.
│   ├── features/
│   │   └── calendar/  The month grid, cards, filters, modal, and data hooks.
│   └── lib/           Env, the Linear client, the GraphQL queries, and the
│                       demo calendar's fake workspace.
├── scripts/           pnpm setup:env.
├── .github/workflows/ CI and the container image publish.
└── Dockerfile         Multi-stage production build.
```

## Heads up

This is an internal ngrok tool we're sharing as-is. It's shaped around how we
work and isn't a supported product, so we may not take issues or pull requests.
Fork it and make it yours.

## License

[MIT](./LICENSE)
