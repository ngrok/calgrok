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
	},
});
