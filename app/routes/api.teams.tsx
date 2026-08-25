import { env } from "~/lib/env.server";
import { linearAuthorization } from "~/lib/linear.server";
import { fetchTeams } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.teams";

// BFF resource route for the team picker. Teams are discovered from the API
// key owner's Linear workspace so forks do not need source-level team IDs.
// LINEAR_TEAM_DEFAULT (team keys) is resolved to ids here and returned as the
// default selection the client applies on first visit.
export async function loader(_: Route.LoaderArgs) {
	const teams = await fetchTeams(linearAuthorization);
	const defaultKeys = new Set(env.LINEAR_TEAM_DEFAULT.map((key) => key.toUpperCase()));
	const defaultTeamIds = teams
		.filter((team) => defaultKeys.has(team.key.toUpperCase()))
		.map((team) => team.id);
	return Response.json({ teams, defaultTeamIds });
}
