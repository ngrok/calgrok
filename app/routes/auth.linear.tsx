import { randomBytes } from "node:crypto";
import { redirect } from "react-router";
import { buildAuthorizeUrl } from "~/lib/linear-oauth.server";
import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth.linear";

// Starts the OAuth flow: stash a CSRF state in the session and redirect to
// Linear's consent screen.
export async function loader({ request }: Route.LoaderArgs) {
	const session = await getSession(request);
	const state = randomBytes(16).toString("hex");
	session.set("oauthState", state);

	return redirect(buildAuthorizeUrl(state), {
		headers: { "Set-Cookie": await commitSession(session) },
	});
}
