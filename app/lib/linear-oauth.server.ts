import { env } from "./env.server";

const AUTHORIZE_URL = "https://linear.app/oauth/authorize";
const TOKEN_URL = "https://api.linear.app/oauth/token";
const REVOKE_URL = "https://api.linear.app/oauth/revoke";

const SCOPES = "read,write"; // write is required to create issues and edit them

export type LinearTokens = {
	accessToken: string;
	refreshToken: string;
	/** Epoch milliseconds. */
	expiresAt: number;
};

type TokenResponse = {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope: string;
};

export function buildAuthorizeUrl(state: string): string {
	const params = new URLSearchParams({
		response_type: "code",
		client_id: env.LINEAR_CLIENT_ID,
		redirect_uri: env.LINEAR_REDIRECT_URI,
		state,
		scope: SCOPES,
		// actor defaults to "user" — issues are created/edited as the signed-in user.
	});
	return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Turn Linear's OAuth error codes into something the reader can act on. These
 * surface during setup, when a value in .env is most likely to be wrong, and
 * Linear's own wording ("Invalid secret") doesn't say which variable to look at.
 */
export function explainTokenFailure(status: number, payload: string): string {
	let code = "";
	try {
		code = (JSON.parse(payload) as { error?: string }).error ?? "";
	} catch {
		// Not JSON. Fall through to the generic message.
	}

	switch (code) {
		case "invalid_secret":
			return [
				"Linear rejected LINEAR_CLIENT_SECRET.",
				"",
				"Copy the current client secret from your OAuth app's settings into .env,",
				"then restart the server. If you rotate the secret, update every deployment",
				"that uses it at the same time, or they stop being able to sign anyone in.",
			].join("\n");
		case "invalid_client":
			return [
				"Linear does not recognize LINEAR_CLIENT_ID.",
				"",
				"Check it against your OAuth app's settings. If you registered the app in a",
				"different Linear workspace, switch to that workspace to find it.",
			].join("\n");
		case "invalid_grant":
			return [
				"Linear rejected the authorization code.",
				"",
				"Codes are single-use and short-lived. Start the sign-in again.",
			].join("\n");
		case "invalid_request":
			return [
				"Linear rejected the token request.",
				"",
				"LINEAR_REDIRECT_URI has to match a redirect URI registered on the OAuth app",
				"exactly, including the scheme and port.",
				"",
				`Linear said: ${payload}`,
			].join("\n");
		default:
			return `Linear token request failed: ${status} ${payload}`;
	}
}

async function requestTokens(
	body: URLSearchParams,
	previousRefreshToken?: string,
): Promise<LinearTokens> {
	const res = await fetch(TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	if (!res.ok) {
		// A thrown Response gives the error screen a heading that reads as a setup
		// problem rather than a crash. Refresh failures are caught by the caller,
		// which sends the visitor back through sign-in instead.
		throw new Response(explainTokenFailure(res.status, await res.text()), {
			status: 500,
			statusText: "Linear sign-in failed",
		});
	}
	const json = (await res.json()) as TokenResponse;
	return {
		accessToken: json.access_token,
		// A refresh response may omit a new refresh token; keep the prior one.
		refreshToken: json.refresh_token ?? previousRefreshToken ?? "",
		expiresAt: Date.now() + json.expires_in * 1000,
	};
}

export function exchangeCodeForTokens(code: string): Promise<LinearTokens> {
	return requestTokens(
		new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: env.LINEAR_REDIRECT_URI,
			client_id: env.LINEAR_CLIENT_ID,
			client_secret: env.LINEAR_CLIENT_SECRET,
		}),
	);
}

export function refreshAccessToken(refreshToken: string): Promise<LinearTokens> {
	return requestTokens(
		new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: env.LINEAR_CLIENT_ID,
			client_secret: env.LINEAR_CLIENT_SECRET,
		}),
		refreshToken,
	);
}

export async function revokeToken(token: string): Promise<void> {
	try {
		await fetch(REVOKE_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: `Bearer ${token}`,
			},
			body: new URLSearchParams({ token }),
		});
	} catch {
		// Best-effort revoke; logging out locally is what matters.
	}
}
