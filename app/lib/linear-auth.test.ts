import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * These cover the two things about auth that break silently:
 *
 * 1. Startup refuses to run without a key, and says how to get one.
 * 2. The `Authorization` header format. Linear wants a personal API key as the
 *    bare key; sending `Bearer <key>` fails as a 401 that reads like an outage.
 */

/** Load env.server fresh under an exact environment. */
async function loadEnv(vars: Record<string, string>) {
	vi.resetModules();
	for (const name of [
		"LINEAR_API_KEY",
		"LINEAR_TEAM_DEFAULT",
		"LINEAR_LABEL_NAMESPACE",
		"LINEAR_PROJECT_LABEL",
	]) {
		vi.stubEnv(name, vars[name] ?? "");
	}
	return await import("./env.server");
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("configuration", () => {
	test("a personal API key is all calgrok needs", async () => {
		const { env } = await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		expect(env.LINEAR_API_KEY).toBe("lin_api_abc123");
	});

	test("a missing key fails at startup, naming the variable", async () => {
		await expect(loadEnv({})).rejects.toThrow(/LINEAR_API_KEY/);
	});

	test("the failure points at the page that issues a key", async () => {
		await expect(loadEnv({})).rejects.toThrow(/linear\.app\/settings\/api/);
	});

	test("the failure names the command that writes a .env", async () => {
		await expect(loadEnv({})).rejects.toThrow(/pnpm setup:env/);
	});

	test("a whitespace-only key counts as unset", async () => {
		await expect(loadEnv({ LINEAR_API_KEY: "   " })).rejects.toThrow(/LINEAR_API_KEY/);
	});

	test("team defaults are split, trimmed, and emptied of blanks", async () => {
		const { env } = await loadEnv({
			LINEAR_API_KEY: "lin_api_abc123",
			LINEAR_TEAM_DEFAULT: " GTM , ,CON ",
		});
		expect(env.LINEAR_TEAM_DEFAULT).toEqual(["GTM", "CON"]);
	});

	test("project labels are split, trimmed, and emptied of blanks", async () => {
		const { env } = await loadEnv({
			LINEAR_API_KEY: "lin_api_abc123",
			LINEAR_PROJECT_LABEL: " Content , ,Campaign ",
		});
		expect(env.LINEAR_PROJECT_LABEL).toEqual(["Content", "Campaign"]);
	});

	test("no project label leaves projects unscoped", async () => {
		const { env } = await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		expect(env.LINEAR_PROJECT_LABEL).toEqual([]);
	});
});

describe("Authorization header", () => {
	test("the key is sent bare, with no Bearer prefix", async () => {
		await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		const { linearAuthorization } = await import("./linear.server");

		expect(linearAuthorization).toBe("lin_api_abc123");
		expect(linearAuthorization).not.toMatch(/^Bearer /);
	});
});
