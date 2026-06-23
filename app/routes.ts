import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("api/issues", "routes/api.issues.tsx"),
	route("api/issue", "routes/api.issue.tsx"),
	route("api/labels", "routes/api.labels.tsx"),
	route("auth/linear", "routes/auth.linear.tsx"),
	route("auth/linear/callback", "routes/auth.linear.callback.tsx"),
	route("auth/logout", "routes/auth.logout.tsx"),
] satisfies RouteConfig;
