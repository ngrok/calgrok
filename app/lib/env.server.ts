// Loads .env into process.env in dev / when running the built server with a
// local .env present. In a real deployment (ngrok Ship) these come from the
// environment and dotenv is a no-op.
import "dotenv/config";

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
	}
	return value;
}

export const env = {
	LINEAR_CLIENT_ID: required("LINEAR_CLIENT_ID"),
	LINEAR_CLIENT_SECRET: required("LINEAR_CLIENT_SECRET"),
	LINEAR_REDIRECT_URI: required("LINEAR_REDIRECT_URI"),
	SESSION_SECRET: required("SESSION_SECRET"),
	LINEAR_LABEL_NAMESPACE: process.env.LINEAR_LABEL_NAMESPACE?.trim() ?? "",
	NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;

export const isProduction = env.NODE_ENV === "production";
