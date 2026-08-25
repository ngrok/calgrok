// Loads .env into process.env in dev / when running the built server with a
// local .env present. In a real deployment (ngrok Ship) these come from the
// environment and dotenv is a no-op.
import "dotenv/config";

/**
 * Slated reaches Linear with a personal API key, and only that.
 *
 * There is no sign-in: every visitor acts as the key's owner. Run it on
 * localhost, or put your own access control in front of it.
 */

function read(name: string): string {
	return process.env[name]?.trim() ?? "";
}

const apiKey = read("LINEAR_API_KEY");

// Fail at startup with the two steps that fix it, rather than on the first
// Linear request with a 401 that looks like a Linear outage.
if (!apiKey) {
	throw new Error(
		[
			"Slated cannot start. LINEAR_API_KEY is not set.",
			"",
			"  1. Create a personal API key at https://linear.app/settings/api",
			"  2. Put it in .env as LINEAR_API_KEY=lin_api_...",
			"",
			"Or run `pnpm setup:env`, which writes that .env for you.",
		].join("\n"),
	);
}

export const env = {
	LINEAR_API_KEY: apiKey,
	LINEAR_LABEL_NAMESPACE: read("LINEAR_LABEL_NAMESPACE"),
	// Team keys (e.g. "GTM,CON") selected by default on first visit. The full
	// workspace team list stays available; this only seeds the initial view.
	LINEAR_TEAM_DEFAULT: read("LINEAR_TEAM_DEFAULT")
		.split(",")
		.map((key) => key.trim())
		.filter(Boolean),
	NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
