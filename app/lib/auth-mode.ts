/**
 * How Slated reaches Linear.
 *
 * - `apiKey` — a personal API key from `LINEAR_API_KEY`. Single-user: every
 *   visitor acts as the key's owner.
 * - `oauth` — a Linear OAuth app. Multi-user: each visitor signs in with their
 *   own Linear account.
 *
 * Declared here rather than in `env.server` so the browser can import the type
 * without reaching into server-only config.
 */
export type AuthMode = "apiKey" | "oauth";
