import { LinearClient } from "@linear/sdk";
import { refreshAccessToken } from "./linear-oauth.server";
import { commitSession, getSession } from "./session.server";

// Refresh a little before actual expiry to avoid races on long requests.
const EXPIRY_BUFFER_MS = 60_000;

export type LinearAuth = {
	client: LinearClient;
	accessToken: string;
	/**
	 * If the access token was refreshed while building this auth, these headers
	 * carry the updated `Set-Cookie`. Loaders/actions MUST include them in their
	 * response so the browser stores the rotated tokens.
	 */
	headers?: Headers;
};

/**
 * Resolves an authenticated Linear client from the request session, refreshing
 * the access token if it is expired or about to expire. Returns null when the
 * user is not logged in (or a refresh failed and they must re-authenticate).
 */
export async function getLinearAuth(request: Request): Promise<LinearAuth | null> {
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
				accessToken: tokens.accessToken,
				headers,
			};
		} catch {
			return null;
		}
	}

	return { client: new LinearClient({ accessToken }), accessToken };
}
