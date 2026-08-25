// Loads .env into process.env in dev / when running the built server with a
// local .env present. In a real deployment (ngrok Ship) these come from the
// environment and dotenv is a no-op.
import { randomBytes } from "node:crypto";
import "dotenv/config";
import type { AuthMode } from "./auth-mode";

/**
 * Slated reaches Linear one of two ways:
 *
 * - `apiKey` — a personal API key in `LINEAR_API_KEY`. Single-user: every
 *   visitor acts as the key's owner, so run this locally or behind your own
 *   access control. Nothing else is required.
 * - `oauth` — a Linear OAuth app. Multi-user: each visitor signs in with their
 *   own Linear account. Needs the client id/secret, the redirect URI, and a
 *   session secret to sign the cookie that carries their tokens.
 *
 * Setting `LINEAR_API_KEY` selects `apiKey`; otherwise OAuth is required.
 */

function read(name: string): string {
	return process.env[name]?.trim() ?? "";
}

const apiKey = read("LINEAR_API_KEY");
const authMode: AuthMode = apiKey ? "apiKey" : "oauth";

const OAUTH_VARS = [
	"LINEAR_CLIENT_ID",
	"LINEAR_CLIENT_SECRET",
	"LINEAR_REDIRECT_URI",
	"SESSION_SECRET",
] as const;

// Report every missing variable at once, with both ways to fix it, instead of
// failing on one more variable per restart.
if (authMode === "oauth") {
	const missing = OAUTH_VARS.filter((name) => !read(name));
	if (missing.length > 0) {
		throw new Error(
			[
				`Slated cannot start. Missing environment variables: ${missing.join(", ")}.`,
				"",
				"Choose one of two setups:",
				"",
				"  Solo: one variable, no OAuth app. You act as yourself.",
				"    LINEAR_API_KEY=lin_api_...  (create one at https://linear.app/settings/api)",
				"",
				"  Team: multi-user OAuth, each person signs in as themselves. Needs all of these.",
				`    ${OAUTH_VARS.join(", ")}`,
				"    (create the app at https://linear.app/settings/api/applications/new)",
				"",
				"Run `pnpm setup:env` to write a .env for either one.",
			].join("\n"),
		);
	}
}

export const env = {
	AUTH_MODE: authMode,
	LINEAR_API_KEY: apiKey,
	LINEAR_CLIENT_ID: read("LINEAR_CLIENT_ID"),
	LINEAR_CLIENT_SECRET: read("LINEAR_CLIENT_SECRET"),
	LINEAR_REDIRECT_URI: read("LINEAR_REDIRECT_URI"),
	// Signs the OAuth session cookie only. `apiKey` mode never opens a session,
	// so a per-process value keeps the cookie store constructible without
	// asking for a secret that would do nothing.
	SESSION_SECRET: read("SESSION_SECRET") || randomBytes(32).toString("hex"),
	LINEAR_LABEL_NAMESPACE: read("LINEAR_LABEL_NAMESPACE"),
	// Team keys (e.g. "GTM,CON") selected by default on first visit. The full
	// workspace team list stays available; this only seeds the initial view.
	LINEAR_TEAM_DEFAULT: read("LINEAR_TEAM_DEFAULT")
		.split(",")
		.map((key) => key.trim())
		.filter(Boolean),
	NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;

export const isProduction = env.NODE_ENV === "production";
