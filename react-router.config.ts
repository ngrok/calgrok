import type { Config } from "@react-router/dev/config";

export default {
	// Server-side rendering is on: the same Node server holds the Linear API key
	// and proxies every Linear request, so the key never reaches the browser.
	ssr: true,
} satisfies Config;
