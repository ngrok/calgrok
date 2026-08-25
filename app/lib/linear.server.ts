import { LinearClient } from "@linear/sdk";
import type { AuthMode } from "./auth-mode";
import { env } from "./env.server";
import { refreshAccessToken } from "./linear-oauth.server";
import { commitSession, getSession } from "./session.server";

// Refresh a little before actual expiry to avoid races on long requests.
const EXPIRY_BUFFER_MS = 60_000;

export type LinearAuth = {
	client: LinearClient;
	/**
	 * Ready-to-send `Authorization` header value. Linear wants a personal API
	 * key as the bare key and an OAuth token as `Bearer <token>`, so the value
	 * is built once here instead of at each call site.
	 * See https://linear.app/developers/graphql#authentication.
	 */
	authorization: string;
	mode: AuthMode;
	/**
	 * If the access token was refreshed while building this auth, these headers
	 * carry the updated `Set-Cookie`. Loaders/actions MUST include them in their
	 * response so the browser stores the rotated tokens.
	 */
	headers?: Headers;
};

/**
 * Resolves an authenticated Linear client.
 *
 * In `apiKey` mode the request is irrelevant: there is no per-user session and
 * every caller acts as the key's owner. In `oauth` mode the tokens come from
 * the session cookie, refreshed when expired or about to expire. Returns null
 * when the user is not logged in, or when a refresh failed and they have to
 * authenticate again.
 */
export async function getLinearAuth(request: Request): Promise<LinearAuth | null> {
	if (env.AUTH_MODE === "apiKey") {
		return {
			client: new LinearClient({ apiKey: env.LINEAR_API_KEY }),
			authorization: env.LINEAR_API_KEY,
			mode: "apiKey",
		};
	}

	const session = await getSession(request);
	const accessToken = session.get("accessToken");
	const refreshToken = session.get("refreshToken");
	const expiresAt = session.get("expiresAt");

	if (!accessToken || !refreshToken || !expiresAt) {
		return null;
	}

	if (Date.now() >= expiresAt - EXPIRY_BUFFER_MS) {
		try {
			const tokens = await refreshAccessToken(refreshToken);
			session.set("accessToken", tokens.accessToken);
			session.set("refreshToken", tokens.refreshToken);
			session.set("expiresAt", tokens.expiresAt);
			const headers = new Headers();
			headers.append("Set-Cookie", await commitSession(session));
			return {
				client: new LinearClient({ accessToken: tokens.accessToken }),
				authorization: `Bearer ${tokens.accessToken}`,
				mode: "oauth",
				headers,
			};
		} catch {
			return null;
		}
	}

	return {
		client: new LinearClient({ accessToken }),
		authorization: `Bearer ${accessToken}`,
		mode: "oauth",
	};
}
