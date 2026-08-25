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
  Capture the month grid signed in, with a few teams selected, at 1440px wide.
  <p align="center">
    <img src="docs/screenshot.png" alt="The Slated month grid, with issue cards placed on their due dates.">
  </p>
-->

## What you get

Slated:

- Places every Linear issue on a month calendar by its due date, which it treats
  as the publish date.
- Reschedules an issue the moment you drop it on another day. The card moves
  first and rolls back if Linear rejects the write.
- Opens any issue in a modal to read its description and edit the due date or
  tags, including clearing the date to drop it off the calendar.
- Creates issues without leaving the calendar. Hover a day, hit `+`, then set a
  title, team, due date, status, priority, and tags.
- Finds your teams from Linear after you sign in, filters by team and label, and
  remembers your view between visits.

## Quickstart

You need [Node](https://nodejs.org) 20 or newer and
[pnpm](https://pnpm.io/installation).

```bash
git clone https://github.com/ngrok/slated.git
cd slated
pnpm install
pnpm setup:env    # asks which setup you want, writes .env (not `pnpm setup`)
pnpm dev          # http://localhost:3000
```

Reload the page once on your first run. Vite optimizes dependencies during that
first load, and until it finishes the page renders but its buttons do nothing.

Pick one of the two setups below. **Solo** takes a couple of minutes, as long as
your Linear workspace lets members create API keys. If it doesn't, go straight to
**team**, which needs nobody's permission.

### Solo: a personal API key

One value, no OAuth app. Create a key at
[linear.app/settings/api](https://linear.app/settings/api) and put it in `.env`:

```
LINEAR_API_KEY=lin_api_...
```

There's no sign-in screen in this mode. Slated acts as the key's owner and loads
the calendar straight away. Keep it on `localhost` or behind your own access
control, because everyone who reaches the server gets your read and write access
to the workspace.

> **Your workspace may not allow this.** Linear admins decide whether members can
> create personal API keys, under **Settings > Administration > API > Member API
> keys**. If that page won't issue you one, that's why. Use the OAuth setup
> instead.

### Team: a Linear OAuth app

Each person signs in with their own Linear account and sees only what Linear
already lets them see. Deploy this setup, not the solo one. It also works no
matter how your workspace restricts API keys.

1. **[Create the OAuth app.][new-app]** That link pre-fills the name, the
   homepage, and `http://localhost:3000/auth/linear/callback` as a redirect URI.
   Add your deployed callback URL too, once you have one. Slated requests the
   `read` and `write` scopes when someone signs in.
2. Put the client ID, the client secret, and the redirect URI in `.env`, along
   with a `SESSION_SECRET` to sign the session cookie. `pnpm setup:env`
   generates the secret for you.
3. Run `pnpm dev`, then click **Connect Linear**.

[new-app]: https://linear.app/settings/api/applications/new?oauth.client_name=Slated&display.description=A+content+calendar+that+runs+live+on+top+of+Linear&oauth.client_uri=https%3A%2F%2Fgithub.com%2Fngrok%2Fslated&oauth.redirect_uris=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Flinear%2Fcallback&oauth.grant_types=authorization_code&distribution=private

Make your own app rather than asking for ours. Self-hosting needs the client
*secret*, which can't be shared.

#### Which workspace should own the app?

The form registers the app in whichever Linear workspace you're in, and every
admin of that workspace can then read its client secret. Hence Linear's
[own advice](https://linear.app/developers/oauth-2-0-authentication):

> It is highly recommended you create a workspace for the purpose of managing the
> OAuth2 Application, as each admin user will have access.

So either register it in the workspace you're planning in, which is simplest and
works with `distribution=private`, or make a workspace of your own and switch the
link to `distribution=public` so your day-job workspace can still authorize it.
The second option keeps the secret off your main workspace's admin surface and
needs nobody's permission, at the cost of continuity: that workspace has to
outlive your interest in it. That's the route we took for ngrok's own instance.

## Configuration

Every value goes in `.env` (see [`.env.example`](./.env.example)). Set either
`LINEAR_API_KEY` or the four OAuth values.

| Variable | Required | What it does |
| --- | --- | --- |
| `LINEAR_API_KEY` | Solo setup | A personal API key. Setting it makes Slated single-user and turns off sign-in. Your admin may have disabled member API keys. |
| `LINEAR_CLIENT_ID` | Team setup | OAuth app client ID. |
| `LINEAR_CLIENT_SECRET` | Team setup | OAuth app client secret. Server-side only. |
| `LINEAR_REDIRECT_URI` | Team setup | Must exactly match a redirect URI registered on the OAuth app. |
| `SESSION_SECRET` | Team setup | Signs the cookie carrying each visitor's Linear tokens. Changing it signs everyone out. |
| `LINEAR_TEAM_DEFAULT` | No | Comma-separated team keys (for example, `GTM,CON`) preselected on a visitor's first load. |
| `LINEAR_LABEL_NAMESPACE` | No | When set (for example, `con/`), scopes the calendar to labels under that prefix and strips it in the UI. |

### Adapting it to your workspace

Slated finds your Linear teams after login and **fetches nothing until you select
at least one**, so an empty calendar on first load usually means no team is picked
yet. `LINEAR_TEAM_DEFAULT` seeds that selection, and every team the visitor can
see stays available to toggle.

Leave `LINEAR_LABEL_NAMESPACE` blank and labels are just optional filters. Set it
to `con/` and only those labels are offered, with the prefix stripped in the UI
and unfiltered views scoped to issues carrying one.

## Deploying

Use the OAuth setup for anything other people can reach. `LINEAR_API_KEY` hands
your own workspace access to every visitor.

### On ngrok Ship

This is how we run Slated. GitHub Actions builds the container and pushes it to
Ship's registry, then Ship runs it behind an HTTPS URL, so there's no host or
registry for you to keep alive. Ship deploys from a connected repository rather
than from an image you point it at, so start by forking.

1. Fork this repo.
2. In the [ngrok dashboard](https://dashboard.ngrok.com/ship), create an app and
   connect your fork. Ship adds a build workflow to the fork, along with the
   registry credential it needs as a repository secret.
3. Set the app's environment variables to the OAuth values from
   [Configuration](#configuration).
4. Push to your fork. The workflow builds the Dockerfile, pushes the image, and
   Ship deploys it.
5. Add `https://<YOUR_SHIP_URL>/auth/linear/callback` to your Linear OAuth app's
   redirect URIs, then point `LINEAR_REDIRECT_URI` at it.

Ship serves HTTPS, which the session cookie needs in production. The Ship
workflow already in this repo runs only for ngrok's own copy, so it stays skipped
in your fork and won't fight the one Ship writes for you.

> **Forking is temporary.** Ship can't yet deploy a container image you point it
> at. When it can, take a prebuilt Slated image, set the environment variables,
> and skip the fork.

### Anywhere else

Build the container and supply the same environment variables at runtime:

```bash
docker build -t slated .
docker run --rm -p 3000:3000 --env-file .env slated
```

Two things to get right:

- Serve it over HTTPS. The session cookie is marked `Secure` in production, so a
  plain-HTTP deployment can never hold a login.
- Register the deployed callback URL on your Linear OAuth app, and point
  `LINEAR_REDIRECT_URI` at it.

## How it works

Slated is a [React Router](https://reactrouter.com) app that talks to Linear from
the server. In the OAuth setup, the token exchange and every Linear request
happen server-side, so an access token lives in a signed, httpOnly cookie and
never reaches the browser. There's no database. The server is a thin proxy in
front of Linear, and the browser caches what it fetches for the session with
[TanStack Query](https://tanstack.com/query). The UI uses
[mantle](https://mantle.ngrok.com), ngrok's design system.

[`docs/design.md`](./docs/design.md) is the original design doc and build log,
including the performance work behind the rendering strategy.

## Why we built it

We plan a lot of content at ngrok, and our issues already lived in Linear with
due dates, labels, and assignees. The calendar we'd been using on top of them was
slow, and it froze the browser tab often enough that people stopped opening it.
Slated is the rebuild. Performance drove the design rather than arriving as a
polish step, which is why the data-fetching strategy in
[`docs/design.md`](./docs/design.md) reads like the core of the project.

It's built for how ngrok's GTM and Content teams work. It's configurable enough
to run against another Linear workspace, and the two setups above are the two
ways we've actually run it.

## Development

```bash
pnpm dev          # dev server on :3000
pnpm test         # vitest
pnpm typecheck    # react-router typegen + tsc
pnpm lint         # biome
pnpm fmt          # biome, writing fixes
pnpm build        # production build
```

## License

[MIT](./LICENSE)
