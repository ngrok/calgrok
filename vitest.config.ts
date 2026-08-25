import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vitest runs without the React Router framework plugin (which is dev/build
// only), so we wire up React here directly. Path aliases resolve natively.
export default defineConfig({
	plugins: [react()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		include: ["app/**/*.test.{ts,tsx}"],
		// Route tests import server modules, which read (and validate) the
		// environment on load. Supply a throwaway one so the suite passes with no
		// local .env, as it must in CI. Tests that care about a specific
		// environment stub it themselves (see app/lib/linear-auth.test.ts).
		env: {
			LINEAR_API_KEY: "lin_api_test",
		},
	},
});
