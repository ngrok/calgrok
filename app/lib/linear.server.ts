import { LinearClient } from "@linear/sdk";
import { env } from "./env.server";

/**
 * A personal API key is server configuration, not a per-user session, so there
 * is one client for the whole process and nothing to resolve per request.
 */
export const linear = new LinearClient({ apiKey: env.LINEAR_API_KEY });

/**
 * Ready-to-send `Authorization` header value for the raw GraphQL calls in
 * `linear-graphql.server`. Linear wants a personal API key as the bare key, with
 * no `Bearer` prefix. See https://linear.app/developers/graphql#authentication.
 */
export const linearAuthorization = env.LINEAR_API_KEY;
