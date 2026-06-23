import { fetchLabels } from "~/lib/linear-graphql.server";
import { getLinearAuth } from "~/lib/linear.server";
import type { Route } from "./+types/api.labels";

// Only labels under this namespace are relevant to the content calendar. We
// filter to them and strip the prefix so the picker reads cleanly (e.g.
// "con/Blog" -> "Blog").
const LABEL_NAMESPACE = "con/";

// BFF resource route for the label filter list.
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const labels = (await fetchLabels(auth.accessToken))
		.filter((label) => label.name.toLowerCase().startsWith(LABEL_NAMESPACE))
		.map((label) => {
			// Strip the prefix for display; the id (used for filtering) is unchanged.
			const stripped = label.name.slice(LABEL_NAMESPACE.length).trim();
			return { ...label, name: stripped || label.name };
		})
		.sort((a, b) => a.name.localeCompare(b.name));

	return Response.json({ labels }, auth.headers ? { headers: auth.headers } : undefined);
}
