import { Button } from "@ngrok/mantle/button";
import { data } from "react-router";
import { Wordmark } from "~/components/wordmark";
import { CalendarPage } from "~/features/calendar/calendar-page";
import type { AuthMode } from "~/lib/auth-mode";
import { getLinearAuth } from "~/lib/linear.server";
import { fetchSession } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/home";

type Viewer = { name: string; email: string };
type Organization = { name: string };

const TITLE = "Slated: content calendar for Linear";
const DESCRIPTION =
	"Everything your team has slated to ship, on one calendar. Slated reads your Linear issues live and places them by due date.";

export function meta({ data: loaded }: Route.MetaArgs) {
	// Link unfurlers (Slack, iMessage, X) need an absolute og:image; a relative
	// one is widely ignored. The origin comes from the loader rather than an env
	// var so the card works on localhost and on any host this is deployed to.
	const image = loaded?.origin ? `${loaded.origin}/og.png` : undefined;

	return [
		{ title: TITLE },
		{ name: "description", content: DESCRIPTION },
		{ property: "og:title", content: TITLE },
		{ property: "og:description", content: DESCRIPTION },
		{ property: "og:type", content: "website" },
		{ property: "og:site_name", content: "Slated" },
		{ name: "twitter:card", content: "summary_large_image" },
		...(image
			? [
					{ property: "og:image", content: image },
					{ property: "og:image:width", content: "1200" },
					{ property: "og:image:height", content: "630" },
					{ property: "og:image:alt", content: "The Slated wordmark on a dark blue field." },
					{ name: "twitter:image", content: image },
				]
			: []),
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const origin = new URL(request.url).origin;
	const auth = await getLinearAuth(request);
	if (!auth) {
		return data({
			viewer: null as Viewer | null,
			organization: null as Organization | null,
			mode: "oauth" as AuthMode,
			origin,
		});
	}

	try {
		const session = await fetchSession(auth.authorization);
		return data(
			{
				viewer: session.viewer as Viewer,
				organization: { name: session.organization.name } as Organization,
				mode: auth.mode,
				origin,
			},
			auth.headers ? { headers: auth.headers } : undefined,
		);
	} catch {
		// A token that Linear rejects. With OAuth the fix is to sign in again; with
		// a personal API key there is nobody to sign in, so the key itself is the
		// problem and the screen has to say so.
		return data({
			viewer: null as Viewer | null,
			organization: null as Organization | null,
			mode: auth.mode,
			origin,
		});
	}
}

export function ConnectScreen() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
			<h1>
				<Wordmark size="lg" />
			</h1>
			<p className="max-w-prose text-lg text-strong">
				Everything your team has slated to ship, on one calendar.
			</p>
			<p className="max-w-prose text-sm text-muted">
				Slated reads your Linear issues live and places them by due date. Connect your Linear
				account to choose teams and get started.
			</p>
			<Button asChild appearance="filled">
				<a href="/auth/linear">Connect Linear</a>
			</Button>
		</main>
	);
}

export function InvalidApiKeyScreen() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-2xl font-medium text-strong">Linear rejected the API key</h1>
			<p className="max-w-prose text-muted">
				<code>LINEAR_API_KEY</code> is set, but Linear would not accept it. Check that it is current
				and pasted whole, then restart the server.
			</p>
			<Button asChild appearance="outlined">
				<a href="https://linear.app/settings/api" target="_blank" rel="noreferrer">
					Manage your API keys
				</a>
			</Button>
		</main>
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	if (loaderData.viewer) {
		return <CalendarPage organization={loaderData.organization} authMode={loaderData.mode} />;
	}
	return loaderData.mode === "apiKey" ? <InvalidApiKeyScreen /> : <ConnectScreen />;
}
