import type { LabelOption } from "~/features/calendar/types";
import { env } from "~/lib/env.server";
import { linearAuthorization } from "~/lib/linear.server";
import { fetchLabels } from "~/lib/linear-graphql.server";
import type { Route } from "./+types/api.labels";

// BFF resource route for the label filter list. If LINEAR_LABEL_NAMESPACE is
// configured, matching labels are tagged and the prefix is stripped for display
// (e.g. "con/web" -> "web"). The client sorts those matches first and uses them
// as the default calendar scope. Other labels remain available as explicit
// optional filters when they apply to the selected teams.
export async function loader(_: Route.LoaderArgs) {
	const namespace = env.LINEAR_LABEL_NAMESPACE;
	const namespaceLower = namespace.toLowerCase();
	const groups = new Map<string, LabelOption>();
	for (const label of await fetchLabels(linearAuthorization)) {
		const matchesNamespace = Boolean(
			namespace && label.name.toLowerCase().startsWith(namespaceLower),
		);
		const name = matchesNamespace
			? label.name.slice(namespace.length).trim() || label.name
			: label.name;
		const groupKey = `${matchesNamespace ? "namespace" : "label"}:${name}`;
		let group = groups.get(groupKey);
		if (!group) {
			group = { name, color: label.color, matchesNamespace, ids: [], idByTeam: {}, globalIds: [] };
			groups.set(groupKey, group);
		}
		group.ids.push(label.id);
		if (label.teamId) {
			group.idByTeam[label.teamId] = label.id;
		} else {
			group.globalIds.push(label.id);
		}
	}

	const labels = [...groups.values()].sort(
		(a, b) =>
			Number(b.matchesNamespace) - Number(a.matchesNamespace) || a.name.localeCompare(b.name),
	);
	return Response.json({ labels, requiresLabelMatch: Boolean(namespace) });
}
