import { Button } from "@ngrok/mantle/button";
import { data } from "react-router";
import { CalendarPage } from "~/features/calendar/calendar-page";
import { linear } from "~/lib/linear.server";
import type { Route } from "./+types/home";

type Viewer = { name: string; email: string };

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "calgrok — Linear Content Calendar" },
		{ name: "description", content: "A fast, live content calendar backed by Linear." },
	];
}

export async function loader(_: Route.LoaderArgs) {
	try {
		const viewer = await linear.viewer;
		return data({ viewer: { name: viewer.name, email: viewer.email } as Viewer });
	} catch {
		// There is nobody to sign in, so a key Linear rejects is the only way to
		// arrive here, and the screen has to say so.
		return data({ viewer: null as Viewer | null });
	}
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
	if (!loaderData.viewer) {
		return <InvalidApiKeyScreen />;
	}
	return <CalendarPage viewer={loaderData.viewer} />;
}
