import { redirect } from "react-router";
import { revokeToken } from "~/lib/linear-oauth.server";
import { destroySession, getSession } from "~/lib/session.server";
import type { Route } from "./+types/auth.logout";

// Logout is a POST (from a form) so it can't be triggered by a stray GET/link.
export async function action({ request }: Route.ActionArgs) {
	const session = await getSession(request);
	const accessToken = session.get("accessToken");
	if (accessToken) {
		await revokeToken(accessToken);
	}
	return redirect("/", {
		headers: { "Set-Cookie": await destroySession(session) },
	});
}

// If someone navigates here directly, just send them home.
export function loader() {
	return redirect("/");
}
