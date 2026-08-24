#!/usr/bin/env node
/**
 * Writes a .env for calgrok.
 *
 * There are two ways to reach Linear, and this picks one for you:
 *
 *   solo — a personal API key. One value, no OAuth app. You act as yourself,
 *          so run it locally or behind your own access control. Needs a
 *          workspace that lets members create API keys.
 *   team — a Linear OAuth app. Each person signs in with their own Linear
 *          account, so it is safe to deploy for a group. Always available: any
 *          member can create an OAuth app.
 *
 * Run it with `pnpm setup:env` (not `pnpm setup`, which is pnpm's own command).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const ENV_PATH = new URL("../.env", import.meta.url);
const API_KEYS_URL = "https://linear.app/settings/api";
const NEW_APP_URL = "https://linear.app/settings/api/applications/new";
const CALLBACK_URL = "http://localhost:3000/auth/linear/callback";

const sessionSecret = () => randomBytes(32).toString("hex");

function soloEnv(apiKey) {
	return `# calgrok — solo setup. You act as the owner of this API key.
# Anyone who can reach this server can act as you, so keep it local or put your
# own access control in front of it. To let other people sign in as themselves,
# delete this file and run \`pnpm setup:env\` again, choosing the team setup.
LINEAR_API_KEY=${apiKey}

# Optional. Comma-separated team keys (for example, GTM,CON) preselected on a
# visitor's first load. Every team stays available to toggle.
LINEAR_TEAM_DEFAULT=

# Optional. When set (for example, con/), the calendar only shows issues with
# labels under this namespace and strips the prefix in the UI.
LINEAR_LABEL_NAMESPACE=
`;
}

function teamEnv({ clientId, clientSecret, redirectUri }) {
	return `# calgrok — team setup. Each person signs in with their own Linear account.
LINEAR_CLIENT_ID=${clientId}
LINEAR_CLIENT_SECRET=${clientSecret}
LINEAR_REDIRECT_URI=${redirectUri}

# Signs the cookie that carries each visitor's Linear tokens. Generated for you.
# Changing it signs everyone out.
SESSION_SECRET=${sessionSecret()}

# Optional. Comma-separated team keys (for example, GTM,CON) preselected on a
# visitor's first load. Every team stays available to toggle.
LINEAR_TEAM_DEFAULT=

# Optional. When set (for example, con/), the calendar only shows issues with
# labels under this namespace and strips the prefix in the UI.
LINEAR_LABEL_NAMESPACE=
`;
}

function reportExisting() {
	const existing = readFileSync(ENV_PATH, "utf8");
	const has = (name) => new RegExp(`^${name}=.+$`, "m").test(existing);
	console.log(".env already exists, so nothing was written.\n");
	if (has("LINEAR_API_KEY")) {
		console.log("  Mode:  solo (LINEAR_API_KEY is set)");
	} else if (has("LINEAR_CLIENT_ID")) {
		const missing = ["LINEAR_CLIENT_SECRET", "LINEAR_REDIRECT_URI", "SESSION_SECRET"].filter(
			(name) => !has(name),
		);
		console.log("  Mode:  team (OAuth)");
		if (missing.length > 0) {
			console.log(`  Missing: ${missing.join(", ")}`);
		}
	} else {
		console.log("  Mode:  none set. Add LINEAR_API_KEY, or the four OAuth variables.");
	}
	console.log("\nDelete .env and run this again to start over. Then: pnpm dev");
}

/** Ctrl+C / Ctrl+D at a prompt should read as "cancelled", not as a crash. */
function isCancellation(error) {
	return error instanceof Error && (error.name === "AbortError" || error.code === "ABORT_ERR");
}

async function main() {
	if (existsSync(ENV_PATH)) {
		reportExisting();
		return;
	}

	if (!stdin.isTTY) {
		// Nothing to prompt with (piped, or a CI shell). Leave a template that
		// names the one value the reader has to supply.
		writeFileSync(ENV_PATH, soloEnv(""));
		console.log(`Wrote .env for the solo setup.

Next: put a personal API key on the LINEAR_API_KEY line.
  1. Open ${API_KEYS_URL}
  2. Create a key, copy it, paste it into .env
  3. pnpm dev`);
		return;
	}

	const rl = createInterface({ input: stdin, output: stdout });
	try {
		console.log(`calgrok setup

  1) Solo — just me, on this machine. One API key, no OAuth app.
       Needs a workspace that lets members create personal API keys.
  2) Team — several people, each signing in with their own Linear account.
       Works everywhere. Any member can create an OAuth app.
`);
		const choice = (await rl.question("Pick 1 or 2 [1]: ")).trim() || "1";

		if (choice === "1") {
			console.log(`\nCreate a personal API key at ${API_KEYS_URL}`);
			const apiKey = (await rl.question("Paste it here: ")).trim();
			writeFileSync(ENV_PATH, soloEnv(apiKey));
			console.log(
				apiKey
					? "\nWrote .env. Next: pnpm dev"
					: `\nWrote .env with an empty LINEAR_API_KEY. Fill it in, then: pnpm dev

If ${API_KEYS_URL} will not issue you a key, your Linear admin has turned off
member API keys. Delete .env and run this again, choosing the team setup.`,
			);
			return;
		}

		console.log(`
Create an OAuth app at ${NEW_APP_URL}

  Redirect URI:  ${CALLBACK_URL}
                 (add your deployed callback URL too, once you have one)
  Scopes:        read, write
`);
		const clientId = (await rl.question("Client ID: ")).trim();
		const clientSecret = (await rl.question("Client secret: ")).trim();
		const redirectUri = (await rl.question(`Redirect URI [${CALLBACK_URL}]: `)).trim();
		writeFileSync(
			ENV_PATH,
			teamEnv({ clientId, clientSecret, redirectUri: redirectUri || CALLBACK_URL }),
		);
		console.log("\nWrote .env with a generated SESSION_SECRET. Next: pnpm dev");
	} finally {
		rl.close();
	}
}

try {
	await main();
} catch (error) {
	if (isCancellation(error)) {
		console.log("\nCancelled. Nothing was written.");
		process.exit(130);
	}
	throw error;
}
