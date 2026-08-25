# calgrok

A fast **content calendar** that runs live on top of [Linear](https://linear.app).

We plan a lot of content at ngrok, and our issues already live in Linear with due
dates, labels, and assignees. What we didn't have was a calendar that felt good to
use: the tool we'd been living in was slow and regularly froze the browser tab.
calgrok is the rebuild. It reads everything straight from the Linear API, shows
your content issues on a month grid by their due date, and lets you reschedule
with a drag or a click. It stores nothing of its own.

_Built for how ngrok's GTM and Content teams work, but configurable enough to
run against another Linear workspace._

## What it does

calgrok:

- Places Linear issues on a month calendar by due date, which we treat as the
  publish date.
- Reschedules an issue when you drag it to another day, and saves that to Linear
  optimistically: the card moves instantly, then rolls back if Linear says no.
- Opens any issue in a modal to read its description and edit the due date or
  tags, including clearing the date to drop it off the calendar.
- Creates issues without leaving the calendar. Hover a day and hit `+`, then set
  a title, team, due date, status, priority, and tags.
- Discovers your teams from Linear, filters by team and label, and remembers view
  options between visits.

## Quickstart

You need [Node](https://nodejs.org) 20 or newer,
[pnpm](https://pnpm.io/installation), and a personal Linear API key from
[linear.app/settings/api](https://linear.app/settings/api).

```bash
git clone https://github.com/ngrok/calgrok.git
cd calgrok
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

There's no sign-in screen. calgrok acts as the key's owner and loads the calendar
straight away.

> [!WARNING]
> **calgrok has no access control of its own.** Everyone who can reach the server
> holds your Linear read and write access, and every issue they create or
> reschedule is attributed to you. Keep it on `localhost`, or put authentication
> in front of it before anyone else can reach it — see [Deploying](#deploying).

> [!NOTE]
> **Your workspace may not allow this.** Linear admins decide whether members can
> create personal API keys, under **Settings > Administration > API**. If that
> page won't issue you one, that's why, and you'll need an admin to turn them
> back on.

## Configuration

Every value goes in `.env` (see [`.env.example`](./.env.example)).

| Variable | Required | What it does |
| --- | --- | --- |
| `LINEAR_API_KEY` | Yes | A personal API key from [linear.app/settings/api](https://linear.app/settings/api). calgrok acts as its owner, and the key stays server-side. |
| `LINEAR_TEAM_DEFAULT` | No | Comma-separated team keys (for example, `GTM,CON`) preselected on a visitor's first load. |
| `LINEAR_LABEL_NAMESPACE` | No | When set (for example, `con/`), scopes the calendar to labels under that prefix and strips it in the UI. |

### Adapting it to your workspace

calgrok discovers your Linear teams and **fetches nothing until you select at
least one**, so an empty calendar on first load usually means no team is picked
yet. `LINEAR_TEAM_DEFAULT` seeds that selection, and every team stays available
to toggle.

Leave `LINEAR_LABEL_NAMESPACE` blank and labels are just optional filters. Set it
to `con/` and only those labels are offered, with the prefix stripped in the UI
and unfiltered views scoped to issues carrying one.

## Deploying

calgrok has no sign-in of its own, so anything other people can reach needs
access control in front of it. Without one, every visitor holds your Linear read
and write access.

### On ngrok Ship

This is how we run calgrok. GitHub Actions builds the container and pushes it to
Ship's registry, then Ship runs it behind an HTTPS URL, so there's no host or
registry for you to keep alive. Ship deploys from a connected repository rather
than from an image you point it at, so start by forking.

1. Fork this repo.
2. In the [ngrok dashboard](https://dashboard.ngrok.com/ship), create an app and
   connect your fork. Ship adds a build workflow to the fork, along with the
   registry credential it needs as a repository secret.
3. Set `LINEAR_API_KEY` on the app, plus whichever optional values from
   [Configuration](#configuration) you want.
4. Put OAuth on the endpoint with a [Traffic
   Policy](https://ngrok.com/docs/traffic-policy/), so ngrok authenticates every
   visitor before a request reaches calgrok:

   ```yaml
   on_http_request:
     - actions:
         - type: oauth
           config:
             provider: google
     - expressions:
         - "!actions.ngrok.oauth.identity.email.endsWith('@example.com')"
       actions:
         - type: deny
           config:
             status_code: 403
   ```

   The first rule makes everyone sign in with Google. The second turns away
   anyone outside your domain. ngrok hosts the OAuth app, so there's no client ID
   or secret to register. Other providers, and rules that check group membership
   instead of a domain, are in the [`oauth` action
   docs](https://ngrok.com/docs/traffic-policy/actions/oauth/).

   Don't skip this step. It's the only thing standing between your Linear
   workspace and the internet, and it's how our own instance runs: the endpoint
   is gated to `@ngrok.com` Google accounts, so ngrok employees reach the
   calendar and nobody else does.
5. Push to your fork. The workflow builds the Dockerfile, pushes the image, and
   Ship deploys it.

The Ship workflow already in this repo runs only for `ngrok/calgrok`, so it stays
skipped in your fork and won't fight the one Ship writes for you.

> [!NOTE]
> **Forking is temporary.** Ship can't yet deploy a container image you point it
> at. When it can, take a prebuilt calgrok image, set the environment variables,
> and skip the fork.

### Anywhere else

Build the container and supply the same environment variables at runtime:

```bash
docker build -t calgrok .
docker run --rm -p 3000:3000 --env-file .env calgrok
```

Bind it to `localhost` and leave it there, or front it with something that
authenticates visitors. calgrok itself serves the calendar to whoever asks.

## How it works

calgrok is a [React Router](https://reactrouter.com) app that talks to Linear
from the server. The API key lives only in the server's environment and every
Linear request is proxied, so the key never reaches the browser. There's no
database: the server is a thin proxy in front of Linear, and the browser caches
what it fetches for the session with
[TanStack Query](https://tanstack.com/query). The UI uses
[mantle](https://mantle.ngrok.com), ngrok's design system.

[`PLAN.md`](./PLAN.md) is the original design doc and build log, including the
performance work that was the whole reason for the rebuild. It describes a
multi-user OAuth flow, which calgrok no longer has.

## Development

```bash
pnpm dev          # dev server on :3000
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
│   └── lib/           Env, the Linear client, and the GraphQL queries.
├── scripts/           pnpm setup:env.
├── .github/workflows/ CI and the ngrok Ship build.
└── Dockerfile         Multi-stage production build.
```

## Heads up

This is an internal ngrok tool we're sharing as-is. It's shaped around how we
work and isn't a supported product, so we may not take issues or pull requests.
Fork it and make it yours.

## License

[MIT](./LICENSE)
