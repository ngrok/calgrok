import { demoStates } from "~/lib/demo.server";
import { env } from "~/lib/env.server";
import { linearAuthorization } from "~/lib/linear.server";
import { fetchWorkflowStates } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.states";

// BFF resource route for the status picker: returns the workflow states for the
// requested teams, each tagged with its team id so the modal can show only the
// statuses that belong to the issue's team.
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const teamIdsParam = url.searchParams.get("teamIds");
	const teamIds = teamIdsParam ? teamIdsParam.split(",").filter(Boolean) : [];
	if (teamIds.length === 0) {
		throw new Response("Missing required 'teamIds' query param", { status: 400 });
	}

	if (env.DEMO) {
		return Response.json({ states: demoStates() });
	}

	const states = await fetchWorkflowStates(linearAuthorization, teamIds);
	return Response.json({ states });
}
