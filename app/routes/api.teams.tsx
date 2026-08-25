import { env } from "~/lib/env.server";
import { getLinearAuth } from "~/lib/linear.server";
import { fetchTeams } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.teams";

// BFF resource route for the team picker. Teams are discovered from the signed
// in user's Linear workspace so forks do not need source-level team IDs.
// LINEAR_TEAM_DEFAULT (team keys) is resolved to ids here and returned as the
// default selection the client applies on first visit.
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const teams = await fetchTeams(auth.authorization);
	const defaultKeys = new Set(env.LINEAR_TEAM_DEFAULT.map((key) => key.toUpperCase()));
	const defaultTeamIds = teams
		.filter((team) => defaultKeys.has(team.key.toUpperCase()))
		.map((team) => team.id);
	return Response.json(
		{ teams, defaultTeamIds },
		auth.headers ? { headers: auth.headers } : undefined,
	);
}
