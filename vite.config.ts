import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), reactRouter()],
	resolve: {
		// Resolve the `~/*` -> `app/*` alias from tsconfig natively (Vite 8+).
		tsconfigPaths: true,
	},
	server: {
		port: 3000,
	},
});
