import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("auth/linear", "routes/auth.linear.tsx"),
	route("auth/linear/callback", "routes/auth.linear.callback.tsx"),
	route("auth/logout", "routes/auth.logout.tsx"),
] satisfies RouteConfig;
