import { getLinearAuth } from "~/lib/linear.server";
import { fetchTeams } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.teams";

// BFF resource route for the team picker. Teams are discovered from the signed
// in user's Linear workspace so forks do not need source-level team IDs.
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const teams = await fetchTeams(auth.accessToken);
	return Response.json({ teams }, auth.headers ? { headers: auth.headers } : undefined);
}
