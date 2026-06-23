import { fetchIssueDetail } from "~/lib/linear-graphql.server";
import { getLinearAuth } from "~/lib/linear.server";
import type { Route } from "./+types/api.issue";

// BFF resource route for on-demand issue detail (the heavy `description` field
// the calendar list query doesn't load).
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const id = new URL(request.url).searchParams.get("id");
	if (!id) {
		throw new Response("Missing 'id' query param", { status: 400 });
	}

	const detail = await fetchIssueDetail(auth.accessToken, id);
	return Response.json(detail, auth.headers ? { headers: auth.headers } : undefined);
}
