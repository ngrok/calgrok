import { env } from "./env.server";

const AUTHORIZE_URL = "https://linear.app/oauth/authorize";
const TOKEN_URL = "https://api.linear.app/oauth/token";
const REVOKE_URL = "https://api.linear.app/oauth/revoke";

const SCOPES = "read,write"; // write is required to update issue dueDate

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
		throw new Error(`Linear token request failed: ${res.status} ${await res.text()}`);
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
