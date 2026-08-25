import { linearAuthorization } from "~/lib/linear.server";
import {
	fetchCalendarIssues,
	updateIssueDueDate,
	updateIssueLabels,
	updateIssueState,
} from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.issues";

// BFF resource route: the browser fetches issues from here (same-origin) and the
// server talks to Linear with the configured API key. The key never reaches the
// browser.
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const start = url.searchParams.get("start");
	const end = url.searchParams.get("end");
	if (!start || !end) {
		throw new Response("Missing required 'start' and 'end' query params", { status: 400 });
	}

	const teamIdsParam = url.searchParams.get("teamIds");
	const teamIds = teamIdsParam ? teamIdsParam.split(",").filter(Boolean) : [];
	if (teamIds.length === 0) {
		throw new Response("Missing required 'teamIds' query param", { status: 400 });
	}

	const labelIdsParam = url.searchParams.get("labelIds");
	const labelIds = labelIdsParam ? labelIdsParam.split(",").filter(Boolean) : [];

	const issues = await fetchCalendarIssues({
		authorization: linearAuthorization,
		teamIds,
		labelIds,
		start,
		end,
	});

	return Response.json({ issues });
}

// Update an issue: POST { issueId, dueDate? , labelIds? } -> Linear issueUpdate.
export async function action({ request }: Route.ActionArgs) {
	const body = (await request.json()) as {
		issueId?: string;
		dueDate?: string | null;
		labelIds?: string[];
		stateId?: string;
	};
	if (!body.issueId) {
		throw new Response("Missing 'issueId'", { status: 400 });
	}

	// dueDate present (string to set, null to clear) vs. absent.
	const hasDueDate = "dueDate" in body;
	const hasLabels = Array.isArray(body.labelIds);
	const hasState = typeof body.stateId === "string";
	if (!hasDueDate && !hasLabels && !hasState) {
		throw new Response("Provide 'dueDate', 'labelIds', and/or 'stateId'", { status: 400 });
	}

	if (hasDueDate) {
		await updateIssueDueDate({
			authorization: linearAuthorization,
			issueId: body.issueId,
			dueDate: body.dueDate ?? null,
		});
	}
	if (hasLabels) {
		await updateIssueLabels({
			authorization: linearAuthorization,
			issueId: body.issueId,
			labelIds: body.labelIds as string[],
		});
	}
	if (hasState) {
		await updateIssueState({
			authorization: linearAuthorization,
			issueId: body.issueId,
			stateId: body.stateId as string,
		});
	}

	return Response.json({ ok: true });
}
