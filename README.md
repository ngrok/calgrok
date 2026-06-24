# calgrok

A fast **content calendar** that runs live on top of [Linear](https://linear.app).

We plan a lot of content at ngrok, and our issues already live in Linear with due
dates, labels, and assignees. What we didn't have was a calendar that felt good to
use: the tool we'd been living in was slow and regularly froze the browser tab.
calgrok is the rebuild. It reads everything straight from the Linear API, shows
your content issues on a month grid by their due date, and lets you reschedule
with a drag or a click. It stores nothing of its own.

_Built for how ngrok's GTM and Content teams work, but the code's here if it's
useful to you._

## What it does

- Shows Linear issues on a month calendar, placed by due date (which we treat as
  the publish date).
- Drag an issue to another day to reschedule it, with the change saved to Linear
  optimistically (it moves instantly and rolls back if Linear says no).
- Opens any issue in a modal to read the description and edit its due date or
  tags, including clearing the date to drop it off the calendar.
- Filters by team and by content-type label, and remembers view options (show
  weekends, completed, and sub-tasks) between visits.

## How it works

calgrok is a [React Router](https://reactrouter.com) app that talks to Linear
over OAuth. The token exchange and every Linear request happen on the server, so
your access token lives in a signed, httpOnly cookie and never reaches the
browser. There's no database: the server is a thin proxy in front of Linear, and
the browser caches what it fetches for the session with
[TanStack Query](https://tanstack.com/query). The UI is built with
[mantle](https://mantle.ngrok.com), ngrok's design system.

## Run your own

You'll need your own Linear OAuth app and a Linear workspace to point it at.

1. Create an OAuth app at
   [linear.app/settings/api/applications/new](https://linear.app/settings/api/applications/new).
   Add `http://localhost:3000/auth/linear/callback` as a redirect URL (add your
   deployed URL's callback too, once you have one), and request the `read` and
   `write` scopes.
2. Copy `.env.example` to `.env` and fill in `LINEAR_CLIENT_ID`,
   `LINEAR_CLIENT_SECRET`, `LINEAR_REDIRECT_URI`, and a `SESSION_SECRET`.
3. Install and run:
   ```bash
   pnpm install
   pnpm dev          # http://localhost:3000
   ```
4. To deploy, build the container and supply the same four environment variables
   at runtime:
   ```bash
   docker build -t calgrok .
   docker run --rm -p 3000:3000 --env-file .env calgrok
   ```
   Serve it over HTTPS (the session cookie is `Secure` in production) and make
   sure the deployed callback URL is registered on your Linear OAuth app.

### Adapt it to your workspace

calgrok is wired to ngrok's setup, so a few things are worth changing for yours:

- The teams it shows live in [`app/lib/teams.ts`](./app/lib/teams.ts) as Linear
  team names and ids. Swap in your own.
- The calendar only shows issues tagged with a content type. We namespace those
  labels under `con/` and surface `blog`, `newsletter`, `socials`, `video`, and
  `web`. Change the namespace in
  [`app/routes/api.labels.tsx`](./app/routes/api.labels.tsx) and the list in
  [`app/lib/content-tags.ts`](./app/lib/content-tags.ts).

## Repo layout

```
.
├── app/
│   ├── routes/        Pages, the OAuth flow, and the BFF API routes that proxy Linear.
│   ├── features/
│   │   └── calendar/  The month grid, issue cards, filters, modal, and data hooks.
│   └── lib/           Server-side env, session, Linear client, and config (teams, tags).
├── Dockerfile         Multi-stage production build.
└── PLAN.md            The design and the milestone-by-milestone build log.
```

## Heads up

This is an internal ngrok tool we're sharing as-is. It's shaped around how we
work and isn't a supported product, so we may not take issues or pull requests.
Fork it and make it yours.

## License

[MIT](./LICENSE)
