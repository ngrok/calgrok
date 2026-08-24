import { Button } from "@ngrok/mantle/button";
import { data } from "react-router";
import { CalendarPage } from "~/features/calendar/calendar-page";
import type { AuthMode } from "~/lib/auth-mode";
import { getLinearAuth } from "~/lib/linear.server";
import type { Route } from "./+types/home";

type Viewer = { name: string; email: string };

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "calgrok — Linear Content Calendar" },
		{ name: "description", content: "A fast, live content calendar backed by Linear." },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		return data({ viewer: null as Viewer | null, mode: "oauth" as AuthMode });
	}

	try {
		const viewer = await auth.client.viewer;
		return data(
			{ viewer: { name: viewer.name, email: viewer.email } as Viewer, mode: auth.mode },
			auth.headers ? { headers: auth.headers } : undefined,
		);
	} catch {
		// A token that Linear rejects. With OAuth the fix is to sign in again; with
		// a personal API key there is nobody to sign in, so the key itself is the
		// problem and the screen has to say so.
		return data({ viewer: null as Viewer | null, mode: auth.mode });
	}
}

export function ConnectScreen() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-4xl font-medium text-strong">calgrok</h1>
			<p className="max-w-prose text-muted">
				A fast, month-view content calendar backed live by Linear. Connect your Linear account to
				choose teams and see issues by their due date.
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
		return <CalendarPage viewer={loaderData.viewer} authMode={loaderData.mode} />;
	}
	return loaderData.mode === "apiKey" ? <InvalidApiKeyScreen /> : <ConnectScreen />;
}
