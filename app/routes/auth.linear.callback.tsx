import { redirect } from "react-router";
import { exchangeCodeForTokens } from "~/lib/linear-oauth.server";
import { commitSession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth.linear.callback";

// Linear redirects back here with ?code & ?state. Validate state, exchange the
// code for tokens (server-side, with the client secret), persist them in the
// session cookie, and land on the calendar.
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const oauthError = url.searchParams.get("error");

	const session = await getSession(request);
	const expectedState = session.get("oauthState");

	if (oauthError) {
		throw new Response(`Linear authorization was denied: ${oauthError}`, { status: 400 });
	}
	if (!code || !state || !expectedState || state !== expectedState) {
		throw new Response("Invalid OAuth state or missing authorization code.", { status: 400 });
	}

	const tokens = await exchangeCodeForTokens(code);
	session.set("accessToken", tokens.accessToken);
	session.set("refreshToken", tokens.refreshToken);
	session.set("expiresAt", tokens.expiresAt);
	session.unset("oauthState");

	return redirect("/", {
		headers: { "Set-Cookie": await commitSession(session) },
	});
}
