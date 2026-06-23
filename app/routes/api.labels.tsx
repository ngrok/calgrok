import type { LabelOption } from "~/features/calendar/types";
import { fetchLabels } from "~/lib/linear-graphql.server";
import { getLinearAuth } from "~/lib/linear.server";
import type { Route } from "./+types/api.labels";

// Only labels under this namespace are relevant to the content calendar. We
// filter to them and strip the prefix so the picker reads cleanly (e.g.
// "con/web" -> "web").
const LABEL_NAMESPACE = "con/";

// BFF resource route for the label filter list. The same `con/x` can be defined
// in multiple teams (separate Linear labels with the same name); we group those
// into one option carrying every id, plus a per-team id for editing.
export async function loader({ request }: Route.LoaderArgs) {
	const auth = await getLinearAuth(request);
	if (!auth) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const groups = new Map<string, LabelOption>();
	for (const label of await fetchLabels(auth.accessToken)) {
		if (!label.name.toLowerCase().startsWith(LABEL_NAMESPACE)) {
			continue;
		}
		const name = label.name.slice(LABEL_NAMESPACE.length).trim() || label.name;
		let group = groups.get(name);
		if (!group) {
			group = { name, color: label.color, ids: [], idByTeam: {} };
			groups.set(name, group);
		}
		group.ids.push(label.id);
		if (label.teamId) {
			group.idByTeam[label.teamId] = label.id;
		}
	}

	const labels = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
	return Response.json({ labels }, auth.headers ? { headers: auth.headers } : undefined);
}
