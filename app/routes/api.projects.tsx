import { demoProjects, demoUpdateProject } from "~/lib/demo.server";
import { env } from "~/lib/env.server";
import { linearAuthorization } from "~/lib/linear.server";
import { fetchCalendarProjects, updateProjectTargetDate } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.projects";

// BFF resource route for the projects on the calendar. It mirrors /api/issues:
// the browser sends the visible window and the selected teams, and the server
// adds the project label scope from LINEAR_PROJECT_LABEL. That label is
// configuration rather than a per-visit filter, so the browser never sends it.
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

	if (env.DEMO) {
		return Response.json({ projects: demoProjects({ start, end, teamIds }) });
	}

	const projects = await fetchCalendarProjects({
		authorization: linearAuthorization,
		teamIds,
		labelNames: env.LINEAR_PROJECT_LABEL,
		start,
		end,
	});

	return Response.json({ projects });
}

// Move a project: POST { projectId, targetDate } -> Linear projectUpdate.
export async function action({ request }: Route.ActionArgs) {
	const body = (await request.json()) as {
		projectId?: string;
		targetDate?: string | null;
	};
	if (!body.projectId) {
		throw new Response("Missing 'projectId'", { status: 400 });
	}
	// targetDate present (string to set, null to clear) vs. absent.
	if (!("targetDate" in body)) {
		throw new Response("Provide 'targetDate'", { status: 400 });
	}

	if (env.DEMO) {
		demoUpdateProject(body.projectId, body.targetDate ?? null);
		return Response.json({ ok: true });
	}

	await updateProjectTargetDate({
		authorization: linearAuthorization,
		projectId: body.projectId,
		targetDate: body.targetDate ?? null,
	});

	return Response.json({ ok: true });
}
