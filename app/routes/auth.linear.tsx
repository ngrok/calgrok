import { randomBytes } from "node:crypto";
import { redirect } from "react-router";
import { env } from "~/lib/env.server";
import { buildAuthorizeUrl } from "~/lib/linear-oauth.server";
import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth.linear";

// Starts the OAuth flow: stash a CSRF state in the session and redirect to
// Linear's consent screen.
export async function loader({ request }: Route.LoaderArgs) {
	// In apiKey mode there is no OAuth app to redirect to, and no session to
	// establish. Nothing links here in that mode; this covers a stale bookmark.
	if (env.AUTH_MODE === "apiKey") {
		throw new Response(
			"This calgrok runs on a personal API key, so there is nothing to sign in to. Unset LINEAR_API_KEY and configure a Linear OAuth app to let people sign in with their own accounts.",
			{ status: 404 },
		);
	}

	const session = await getSession(request);
	const state = randomBytes(16).toString("hex");
	session.set("oauthState", state);

	return redirect(buildAuthorizeUrl(state), {
		headers: { "Set-Cookie": await commitSession(session) },
	});
}
