import { createCookieSessionStorage } from "react-router";
import { env, isProduction } from "./env.server";

type SessionData = {
	accessToken: string;
	refreshToken: string;
	/** Epoch milliseconds when the access token expires. */
	expiresAt: number;
	/** Short-lived CSRF token for the OAuth round-trip. */
	oauthState: string;
};

// The cookie is signed (HMAC) with SESSION_SECRET and marked httpOnly + secure,
// so the Linear tokens it carries are never readable by client-side JS and only
// travel over HTTPS in production. No server-side/database token storage.
const storage = createCookieSessionStorage<SessionData>({
	cookie: {
		name: "slated_session",
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secrets: [env.SESSION_SECRET],
		secure: isProduction,
		maxAge: 60 * 60 * 24 * 30, // 30 days
	},
});

export const { commitSession, destroySession } = storage;

export function getSession(request: Request) {
	return storage.getSession(request.headers.get("Cookie"));
}
