import type { Config } from "@react-router/dev/config";

export default {
	// Server-side rendering is on: the same Node server handles the OAuth token
	// exchange and the Linear BFF proxy (see PLAN.md).
	ssr: true,
} satisfies Config;
