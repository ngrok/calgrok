#!/usr/bin/env node
/**
 * Writes a .env for calgrok.
 *
 * calgrok needs one value: a personal Linear API key. There is no sign-in, so
 * calgrok acts as the key's owner and everyone who reaches the server gets that
 * access. Run it locally, or put your own access control in front of it.
 *
 * Run it with `pnpm setup:env` (not `pnpm setup`, which is pnpm's own command).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

const ENV_PATH = new URL("../.env", import.meta.url);
const API_KEYS_URL = "https://linear.app/settings/api";

function template(apiKey) {
	return `# calgrok. You act as the owner of this API key: there is no sign-in, so anyone
# who can reach this server can act as you. Keep it local, or put your own access
# control in front of it (see "Deploying" in the README).
LINEAR_API_KEY=${apiKey}

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
	const hasKey = /^LINEAR_API_KEY=.+$/m.test(existing);
	console.log(".env already exists, so nothing was written.\n");
	console.log(
		hasKey
			? "  LINEAR_API_KEY is set. Next: pnpm dev"
			: `  LINEAR_API_KEY is empty. Put a key from ${API_KEYS_URL} on that line.`,
	);
	console.log("\nDelete .env and run this again to start over.");
}

/** Ctrl+C / Ctrl+D at a prompt should read as "cancelled", not as a crash. */
function isCancellation(error) {
	return error instanceof Error && (error.name === "AbortError" || error.code === "ABORT_ERR");
}

const NO_KEY_HELP = `If ${API_KEYS_URL} will not issue you a key, your Linear admin has turned off
member API keys, under Settings > Administration > API. Ask them to allow them,
or ask for a key from someone who can create one.`;

async function main() {
	if (existsSync(ENV_PATH)) {
		reportExisting();
		return;
	}

	if (!stdin.isTTY) {
		// Nothing to prompt with (piped, or a CI shell). Leave a template that
		// names the one value the reader has to supply.
		writeFileSync(ENV_PATH, template(""));
		console.log(`Wrote .env.

Next: put a personal API key on the LINEAR_API_KEY line.
  1. Open ${API_KEYS_URL}
  2. Create a key, copy it, paste it into .env
  3. pnpm dev`);
		return;
	}

	const rl = createInterface({ input: stdin, output: stdout });
	try {
		console.log(`calgrok setup

calgrok needs one personal Linear API key. Create one at
${API_KEYS_URL}
`);
		const apiKey = (await rl.question("Paste it here: ")).trim();
		writeFileSync(ENV_PATH, template(apiKey));
		console.log(
			apiKey
				? "\nWrote .env. Next: pnpm dev"
				: `\nWrote .env with an empty LINEAR_API_KEY. Fill it in, then: pnpm dev\n\n${NO_KEY_HELP}`,
		);
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
