import { fetchCalendarIssues, updateIssueDueDate } from "~/lib/linear-graphql.server";
import { getLinearAuth } from "~/lib/linear.server";
import { DEFAULT_TEAM_IDS } from "~/lib/teams";
import type { Route } from "./+types/api.issues";

// BFF resource route: the browser fetches issues from here (same-origin, cookie
// auto-attached); the server reads the token from the session and talks to
// Linear. The token never reaches the browser.
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const url = new URL(request.url);
	const start = url.searchParams.get("start");
	const end = url.searchParams.get("end");
	if (!start || !end) {
		throw new Response("Missing required 'start' and 'end' query params", { status: 400 });
	}

	const teamIdsParam = url.searchParams.get("teamIds");
	const teamIds = teamIdsParam ? teamIdsParam.split(",").filter(Boolean) : DEFAULT_TEAM_IDS;

	const labelIdsParam = url.searchParams.get("labelIds");
	const labelIds = labelIdsParam ? labelIdsParam.split(",").filter(Boolean) : [];

	const issues = await fetchCalendarIssues({
		accessToken: auth.accessToken,
		teamIds,
		labelIds,
		start,
		end,
	});

	// auth.headers carries a refreshed Set-Cookie when the token was rotated.
	return Response.json({ issues }, auth.headers ? { headers: auth.headers } : undefined);
}

// Reschedule an issue: POST { issueId, dueDate } -> Linear issueUpdate.
export async function action({ request }: Route.ActionArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const body = (await request.json()) as { issueId?: string; dueDate?: string };
	if (!body.issueId || !body.dueDate) {
		throw new Response("Missing 'issueId' or 'dueDate'", { status: 400 });
	}

	await updateIssueDueDate({
		accessToken: auth.accessToken,
		issueId: body.issueId,
		dueDate: body.dueDate,
	});

	return Response.json({ ok: true }, auth.headers ? { headers: auth.headers } : undefined);
}
