import { Button } from "@ngrok/mantle/button";
import { data, Form } from "react-router";
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
		return data({ viewer: null as Viewer | null });
	}

	try {
		const viewer = await auth.client.viewer;
		return data(
			{ viewer: { name: viewer.name, email: viewer.email } as Viewer },
			auth.headers ? { headers: auth.headers } : undefined,
		);
	} catch {
		// Token present but rejected by Linear — treat as logged out.
		return data({ viewer: null as Viewer | null });
	}
}

export function HomeView({ viewer }: { viewer: Viewer | null }) {
	return (
		<main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-4xl font-medium text-strong">calgrok</h1>
			<p className="max-w-prose text-muted">
				A fast, month-view content calendar backed live by Linear.
			</p>

			{viewer ? (
				<div className="flex flex-col items-center gap-3">
					<p className="text-muted">
						Connected as <span className="text-strong">{viewer.name}</span> ({viewer.email})
					</p>
					<Form method="post" action="/auth/logout">
						<Button type="submit" appearance="outlined">
							Disconnect Linear
						</Button>
					</Form>
				</div>
			) : (
				<Button asChild appearance="filled">
					<a href="/auth/linear">Connect Linear</a>
				</Button>
			)}
		</main>
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return <HomeView viewer={loaderData.viewer} />;
}
