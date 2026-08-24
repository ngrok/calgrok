import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * These cover the two things about auth that break silently:
 *
 * 1. Which mode a given environment selects, and what it demands.
 * 2. The `Authorization` header format. Linear wants a personal API key as the
 *    bare key and an OAuth token as `Bearer <token>`; sending the wrong shape
 *    fails as a 401 that looks like an expired login.
 */

const OAUTH_ENV = {
	LINEAR_CLIENT_ID: "client-id",
	LINEAR_CLIENT_SECRET: "client-secret",
	LINEAR_REDIRECT_URI: "http://localhost:3000/auth/linear/callback",
	SESSION_SECRET: "session-secret",
};

/** Load env.server fresh under an exact environment. */
async function loadEnv(vars: Record<string, string>) {
	vi.resetModules();
	for (const name of [
		"LINEAR_API_KEY",
		"LINEAR_CLIENT_ID",
		"LINEAR_CLIENT_SECRET",
		"LINEAR_REDIRECT_URI",
		"SESSION_SECRET",
		"LINEAR_TEAM_DEFAULT",
		"LINEAR_LABEL_NAMESPACE",
	]) {
		vi.stubEnv(name, vars[name] ?? "");
	}
	return await import("./env.server");
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("auth mode selection", () => {
	test("a personal API key selects apiKey mode and needs nothing else", async () => {
		const { env } = await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		expect(env.AUTH_MODE).toBe("apiKey");
		expect(env.LINEAR_API_KEY).toBe("lin_api_abc123");
	});

	test("a full OAuth environment selects oauth mode", async () => {
		const { env } = await loadEnv(OAUTH_ENV);
		expect(env.AUTH_MODE).toBe("oauth");
	});

	test("an API key wins even when OAuth values are also present", async () => {
		const { env } = await loadEnv({ ...OAUTH_ENV, LINEAR_API_KEY: "lin_api_abc123" });
		expect(env.AUTH_MODE).toBe("apiKey");
	});

	test("apiKey mode invents a session secret, since no session is opened", async () => {
		const { env } = await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		expect(env.SESSION_SECRET).toMatch(/^[0-9a-f]{64}$/);
	});

	test("a partial OAuth environment names every missing variable at once", async () => {
		await expect(loadEnv({ LINEAR_CLIENT_ID: "client-id" })).rejects.toThrow(
			/LINEAR_CLIENT_SECRET, LINEAR_REDIRECT_URI, SESSION_SECRET/,
		);
	});

	test("the failure points at the API key as the simpler fix", async () => {
		await expect(loadEnv({})).rejects.toThrow(/LINEAR_API_KEY/);
	});

	test("the failure names the command that writes a .env", async () => {
		await expect(loadEnv({})).rejects.toThrow(/pnpm setup:env/);
	});

	test("whitespace-only values count as unset", async () => {
		await expect(loadEnv({ ...OAUTH_ENV, SESSION_SECRET: "   " })).rejects.toThrow(
			/SESSION_SECRET/,
		);
	});
});

describe("Authorization header", () => {
	test("apiKey mode sends the bare key, with no Bearer prefix", async () => {
		await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		const { getLinearAuth } = await import("./linear.server");

		const auth = await getLinearAuth(new Request("http://localhost:3000/"));

		expect(auth?.mode).toBe("apiKey");
		expect(auth?.authorization).toBe("lin_api_abc123");
		expect(auth?.authorization).not.toMatch(/^Bearer /);
	});

	test("apiKey mode authenticates without a session cookie", async () => {
		await loadEnv({ LINEAR_API_KEY: "lin_api_abc123" });
		const { getLinearAuth } = await import("./linear.server");

		// No Cookie header at all: there is nothing to sign in to in this mode.
		await expect(getLinearAuth(new Request("http://localhost:3000/"))).resolves.not.toBeNull();
	});

	test("oauth mode with no session is not authenticated", async () => {
		await loadEnv(OAUTH_ENV);
		const { getLinearAuth } = await import("./linear.server");

		await expect(getLinearAuth(new Request("http://localhost:3000/"))).resolves.toBeNull();
	});

	test("oauth mode sends the access token as a Bearer token", async () => {
		await loadEnv(OAUTH_ENV);
		const { commitSession, getSession } = await import("./session.server");
		const { getLinearAuth } = await import("./linear.server");

		// Build a real signed session cookie rather than mocking the store, so the
		// header this asserts on is the one a live request would produce.
		const session = await getSession(new Request("http://localhost:3000/"));
		session.set("accessToken", "oauth-token");
		session.set("refreshToken", "refresh-token");
		session.set("expiresAt", Date.now() + 60 * 60 * 1000);
		const cookie = await commitSession(session);

		const auth = await getLinearAuth(
			new Request("http://localhost:3000/", { headers: { Cookie: cookie } }),
		);

		expect(auth?.mode).toBe("oauth");
		expect(auth?.authorization).toBe("Bearer oauth-token");
	});
});
